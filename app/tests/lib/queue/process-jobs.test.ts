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
  claimQueueJobs.mockResolvedValue([claimedJob]);
  recordDeliveryAttempt.mockResolvedValue({ deadLettered: false });
  const selectProvider = vi.fn().mockResolvedValue(EmailProvider.MAILGUN);
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

  expect(claimQueueJobs).toHaveBeenCalledWith({ workerId: "worker-a", limit: 10 });
  expect(selectProvider).toHaveBeenCalledWith(claimedJob);
  expect(dispatch).toHaveBeenCalledWith(claimedJob, EmailProvider.MAILGUN);
  expect(recordDeliveryAttempt).toHaveBeenCalledWith({
    queueJobId: "queue-job-id",
    workerId: "worker-a",
    provider: EmailProvider.MAILGUN,
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
  const selectProvider = vi.fn().mockResolvedValue(EmailProvider.MAILGUN);
  const dispatch = vi.fn().mockRejectedValue(new Error("Mailgun request failed"));

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
    provider: EmailProvider.MAILGUN,
    succeeded: false,
    errorMessage: "Mailgun request failed",
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
  const selectProvider = vi.fn().mockResolvedValue(EmailProvider.MAILGUN);
  const dispatch = vi.fn().mockResolvedValue({ succeeded: true, httpStatus: 200 });

  await processQueueJobs({ workerId: "worker-a", selectProvider, dispatch });

  expect(releaseClaimedJob).not.toHaveBeenCalled();
});
