import { beforeEach, expect, test, vi } from "vitest";

const { claimQueueJobs, recordDeliveryAttempt, releaseClaimedJob } = vi.hoisted(() => ({
  claimQueueJobs: vi.fn(),
  recordDeliveryAttempt: vi.fn(),
  releaseClaimedJob: vi.fn(),
}));

vi.mock("@/lib/queue/claim-jobs", () => ({ claimQueueJobs, releaseClaimedJob }));
vi.mock("@/lib/queue/delivery-logger", () => ({ recordDeliveryAttempt }));

import { EmailProvider } from "@prisma/client";

import { processQueueJobs } from "@/lib/queue/process-jobs";

const claimedJob = {
  id: "queue-job-id",
  deliveryId: "delivery-id",
  retryCount: 0,
  maxRetries: 3,
  scheduledAt: new Date("2026-09-30T00:00:00.000Z"),
  lockExpiresAt: new Date("2026-09-30T00:05:00.000Z"),
};

beforeEach(() => {
  vi.resetAllMocks();
  releaseClaimedJob.mockResolvedValue(true);
});

test("dispatches claimed jobs and records successful attempts", async () => {
  claimQueueJobs.mockResolvedValueOnce([claimedJob]).mockResolvedValue([]);
  recordDeliveryAttempt.mockResolvedValue({ deadLettered: false });
  const selectProvider = vi.fn().mockResolvedValue(EmailProvider.BREVO);
  const dispatch = vi.fn().mockResolvedValue({
    succeeded: true,
    httpStatus: 200,
  });

  await expect(processQueueJobs({ workerId: "worker-a", limit: 10, selectProvider, dispatch })).resolves.toEqual({
    claimed: 1,
    completed: 1,
    retried: 0,
    deadLettered: 0,
    held: 0,
  });

  // One slot claims two at a time, so a long run never outlives its leases.
  expect(claimQueueJobs).toHaveBeenNthCalledWith(1, { workerId: "worker-a", limit: 2 });
  expect(selectProvider).toHaveBeenCalledWith(claimedJob);
  expect(dispatch).toHaveBeenCalledWith(claimedJob, EmailProvider.BREVO);
  expect(recordDeliveryAttempt).toHaveBeenCalledWith({
    queueJobId: "queue-job-id",
    workerId: "worker-a",
    provider: EmailProvider.BREVO,
    succeeded: true,
    httpStatus: 200,
  });
});

test("counts retryable and dead-lettered provider failures", async () => {
  claimQueueJobs.mockResolvedValue([claimedJob, { ...claimedJob, id: "second-job-id" }]);
  recordDeliveryAttempt.mockResolvedValueOnce({ deadLettered: false }).mockResolvedValueOnce({ deadLettered: true });
  const selectProvider = vi.fn().mockResolvedValue(EmailProvider.BREVO);
  const dispatch = vi.fn().mockResolvedValue({
    succeeded: false,
    httpStatus: 503,
    errorMessage: "Provider unavailable",
  });

  await expect(processQueueJobs({ workerId: "worker-a", selectProvider, dispatch })).resolves.toEqual({
    claimed: 2,
    completed: 0,
    retried: 1,
    deadLettered: 1,
    held: 0,
  });
});

test("records a retry when the selected provider throws", async () => {
  claimQueueJobs.mockResolvedValue([claimedJob]);
  recordDeliveryAttempt.mockResolvedValue({ deadLettered: false });
  const selectProvider = vi.fn().mockResolvedValue(EmailProvider.BREVO);
  const dispatch = vi.fn().mockRejectedValue(new Error("Brevo request failed"));

  await expect(processQueueJobs({ workerId: "worker-a", selectProvider, dispatch })).resolves.toEqual({
    claimed: 1,
    completed: 0,
    retried: 1,
    deadLettered: 0,
    held: 0,
  });

  expect(recordDeliveryAttempt).toHaveBeenCalledWith({
    queueJobId: "queue-job-id",
    workerId: "worker-a",
    provider: EmailProvider.BREVO,
    succeeded: false,
    errorMessage: "Brevo request failed",
  });
});

test("holds a job and records nothing when no provider has capacity", async () => {
  // US-23: unsent work stays in the queue when the daily quotas are spent.
  claimQueueJobs.mockResolvedValue([claimedJob]);
  const selectProvider = vi.fn().mockResolvedValue(null);
  const dispatch = vi.fn();

  await expect(processQueueJobs({ workerId: "worker-a", selectProvider, dispatch })).resolves.toEqual({
    claimed: 1,
    completed: 0,
    retried: 0,
    deadLettered: 0,
    held: 1,
  });

  expect(dispatch).not.toHaveBeenCalled();
  // A held job is not a failure, so it must not create an attempt row — that
  // would increment retryCount and slowly dead-letter a backlog that was only
  // ever waiting for tomorrow's quota.
  expect(recordDeliveryAttempt).not.toHaveBeenCalled();
  expect(releaseClaimedJob).toHaveBeenCalledWith({ queueJobId: "queue-job-id", workerId: "worker-a" });
});

test("releases a job when provider selection fails", async () => {
  claimQueueJobs.mockResolvedValue([claimedJob]);
  const selectProvider = vi.fn().mockRejectedValue(new Error("Quota lookup failed"));
  const dispatch = vi.fn();

  await expect(processQueueJobs({ workerId: "worker-a", selectProvider, dispatch })).rejects.toThrow(
    "Quota lookup failed",
  );

  expect(releaseClaimedJob).toHaveBeenCalledWith({ queueJobId: "queue-job-id", workerId: "worker-a" });
  expect(dispatch).not.toHaveBeenCalled();
  expect(recordDeliveryAttempt).not.toHaveBeenCalled();
});

test("keeps working the batch after one job is held", async () => {
  claimQueueJobs.mockResolvedValue([
    claimedJob,
    { ...claimedJob, id: "second-job-id" },
    { ...claimedJob, id: "third-job-id" },
  ]);
  recordDeliveryAttempt.mockResolvedValue({ deadLettered: false });

  // Exhausted for the first job, capacity for the rest.
  const selectProvider = vi
    .fn()
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(EmailProvider.BREVO)
    .mockResolvedValueOnce(EmailProvider.BREVO);
  const dispatch = vi.fn().mockResolvedValue({ succeeded: true, httpStatus: 202 });

  const result = await processQueueJobs({ workerId: "worker-a", selectProvider, dispatch });

  expect(result).toMatchObject({ claimed: 3, completed: 2, held: 1, retried: 0, deadLettered: 0 });
  expect(dispatch).toHaveBeenCalledTimes(2);
});

test("does not release a claim for a job that was dispatched", async () => {
  claimQueueJobs.mockResolvedValue([claimedJob]);
  recordDeliveryAttempt.mockResolvedValue({ deadLettered: false });
  const selectProvider = vi.fn().mockResolvedValue(EmailProvider.BREVO);
  const dispatch = vi.fn().mockResolvedValue({ succeeded: true, httpStatus: 200 });

  await processQueueJobs({ workerId: "worker-a", selectProvider, dispatch });

  expect(releaseClaimedJob).not.toHaveBeenCalled();
});

function jobs(count: number, prefix = "job") {
  return Array.from({ length: count }, (_, index) => ({ ...claimedJob, id: `${prefix}-${index}` }));
}

const sendsSucceed = () => ({
  selectProvider: vi.fn().mockResolvedValue(EmailProvider.BREVO),
  dispatch: vi.fn().mockResolvedValue({ succeeded: true, httpStatus: 201 }),
});

test("keeps claiming batches until the run's limit is reached", async () => {
  claimQueueJobs.mockImplementation(async ({ limit }: { limit: number }) => jobs(limit));
  recordDeliveryAttempt.mockResolvedValue({ deadLettered: false });

  const result = await processQueueJobs({ workerId: "worker-a", limit: 25, concurrency: 5, ...sendsSucceed() });

  expect(result).toMatchObject({ claimed: 25, completed: 25 });
  // Batches of ten (five slots x two), then the five that remain.
  expect(claimQueueJobs.mock.calls.map(([input]) => input.limit)).toEqual([10, 10, 5]);
});

test("stops when the queue is empty", async () => {
  claimQueueJobs.mockResolvedValueOnce(jobs(3)).mockResolvedValue([]);
  recordDeliveryAttempt.mockResolvedValue({ deadLettered: false });

  const result = await processQueueJobs({ workerId: "worker-a", limit: 300, concurrency: 5, ...sendsSucceed() });

  expect(result).toMatchObject({ claimed: 3, completed: 3 });
  expect(claimQueueJobs).toHaveBeenCalledTimes(2);
});

test("claims nothing more once the deadline has passed", async () => {
  claimQueueJobs.mockImplementation(async ({ limit }: { limit: number }) => jobs(limit));
  recordDeliveryAttempt.mockResolvedValue({ deadLettered: false });
  const now = vi.spyOn(Date, "now").mockReturnValue(1_000);

  try {
    const { selectProvider, dispatch } = sendsSucceed();
    // The deadline passes while the first batch is being sent.
    dispatch.mockImplementation(async () => {
      now.mockReturnValue(2_000);
      return { succeeded: true, httpStatus: 201 };
    });

    const result = await processQueueJobs({
      workerId: "worker-a",
      limit: 300,
      concurrency: 5,
      claimDeadline: 1_500,
      selectProvider,
      dispatch,
    });

    expect(claimQueueJobs).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ claimed: 10, completed: 10 });
  } finally {
    now.mockRestore();
  }
});

test("stops claiming once the daily quota is spent", async () => {
  claimQueueJobs.mockImplementation(async ({ limit }: { limit: number }) => jobs(limit));
  recordDeliveryAttempt.mockResolvedValue({ deadLettered: false });
  const selectProvider = vi.fn().mockResolvedValueOnce(EmailProvider.BREVO).mockResolvedValue(null);
  const dispatch = vi.fn().mockResolvedValue({ succeeded: true, httpStatus: 201 });

  const result = await processQueueJobs({ workerId: "worker-a", limit: 300, concurrency: 1, selectProvider, dispatch });

  // Claiming again would only pick the released jobs back up and hold them again.
  expect(claimQueueJobs).toHaveBeenCalledTimes(1);
  expect(result).toMatchObject({ claimed: 2, completed: 1, held: 1 });
});

test("never has more sends in flight than the concurrency allows", async () => {
  claimQueueJobs.mockResolvedValueOnce(jobs(10)).mockResolvedValue([]);
  recordDeliveryAttempt.mockResolvedValue({ deadLettered: false });
  let inFlight = 0;
  let peak = 0;
  const dispatch = vi.fn().mockImplementation(async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return { succeeded: true, httpStatus: 201 };
  });

  await processQueueJobs({
    workerId: "worker-a",
    limit: 10,
    concurrency: 3,
    selectProvider: vi.fn().mockResolvedValue(EmailProvider.BREVO),
    dispatch,
  });

  expect(peak).toBe(3);
  expect(dispatch).toHaveBeenCalledTimes(10);
});

test("lets sends already in flight finish before re-throwing a failure", async () => {
  claimQueueJobs.mockResolvedValue(jobs(2));
  recordDeliveryAttempt.mockResolvedValue({ deadLettered: false });
  const selectProvider = vi
    .fn()
    .mockRejectedValueOnce(new Error("Quota lookup failed"))
    .mockResolvedValue(EmailProvider.BREVO);
  const dispatch = vi.fn().mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { succeeded: true, httpStatus: 201 };
  });

  await expect(
    processQueueJobs({ workerId: "worker-a", limit: 2, concurrency: 2, selectProvider, dispatch }),
  ).rejects.toThrow("Quota lookup failed");

  // The other slot's send was recorded rather than abandoned mid-flight.
  expect(recordDeliveryAttempt).toHaveBeenCalledTimes(1);
  expect(claimQueueJobs).toHaveBeenCalledTimes(1);
});
