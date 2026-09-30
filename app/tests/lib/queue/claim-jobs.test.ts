import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { getPrismaClient } = vi.hoisted(() => ({ getPrismaClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ getPrismaClient }));

import { claimQueueJobs, releaseClaimedJob } from "@/lib/queue/claim-jobs";

const queryRaw = vi.fn();
const transaction = { $queryRaw: queryRaw };
const database = { $transaction: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  getPrismaClient.mockReturnValue(database);
  database.$transaction.mockImplementation(async (operation) => operation(transaction));
});

afterEach(() => {
  vi.resetAllMocks();
});

test("claims queue jobs transactionally", async () => {
  const claimedJob = {
    id: "queue-job-id",
    deliveryId: "delivery-id",
    retryCount: 0,
    maxRetries: 3,
    scheduledAt: new Date("2026-09-30T00:00:00.000Z"),
    lockExpiresAt: new Date("2026-09-30T00:05:00.000Z"),
  };
  queryRaw.mockResolvedValue([claimedJob]);

  await expect(claimQueueJobs({ workerId: "worker-a", limit: 10 })).resolves.toEqual([
    claimedJob,
  ]);
  expect(database.$transaction).toHaveBeenCalledOnce();
  expect(queryRaw).toHaveBeenCalledOnce();
});

test("rejects an invalid worker ID or claim limit", async () => {
  await expect(claimQueueJobs({ workerId: " " })).rejects.toThrow("workerId is required.");
  await expect(claimQueueJobs({ workerId: "worker-a", limit: 0 })).rejects.toThrow(
    "limit must be an integer between 1 and 100.",
  );
  await expect(
    claimQueueJobs({ workerId: "worker-a", lockDurationSeconds: 0 }),
  ).rejects.toThrow("lockDurationSeconds must be a positive integer.");
  expect(getPrismaClient).not.toHaveBeenCalled();
});

test("reports a released job", async () => {
  queryRaw.mockResolvedValue([{ id: "queue-job-id" }]);

  await expect(
    releaseClaimedJob({ queueJobId: "queue-job-id", workerId: "worker-a" }),
  ).resolves.toBe(true);
  expect(database.$transaction).toHaveBeenCalledOnce();
});

test("reports a job it did not own as not released", async () => {
  // The WHERE clause is scoped to lockedBy, so a worker whose lock was already
  // stolen cannot release the other worker's claim. An empty result is the
  // signal that nothing changed.
  queryRaw.mockResolvedValue([]);

  await expect(
    releaseClaimedJob({ queueJobId: "queue-job-id", workerId: "worker-a" }),
  ).resolves.toBe(false);
});

test("rejects an empty worker ID when releasing", async () => {
  await expect(
    releaseClaimedJob({ queueJobId: "queue-job-id", workerId: " " }),
  ).rejects.toThrow("workerId is required.");
  expect(getPrismaClient).not.toHaveBeenCalled();
});
