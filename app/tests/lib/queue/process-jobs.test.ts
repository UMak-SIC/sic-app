import { beforeEach, expect, test, vi } from "vitest";

const { claimQueueJobs, recordDeliveryAttempt } = vi.hoisted(() => ({
  claimQueueJobs: vi.fn(),
  recordDeliveryAttempt: vi.fn(),
}));

vi.mock("@/lib/queue/claim-jobs", () => ({ claimQueueJobs }));
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
  });

  expect(recordDeliveryAttempt).toHaveBeenCalledWith({
    queueJobId: "queue-job-id",
    workerId: "worker-a",
    provider: EmailProvider.MAILGUN,
    succeeded: false,
    errorMessage: "Mailgun request failed",
  });
});
