import "server-only";

import { Prisma } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

type ClaimQueueJobsInput = {
  workerId: string;
  limit?: number;
  lockDurationSeconds?: number;
};

export type ClaimedQueueJob = {
  id: string;
  deliveryId: string;
  idempotencyKey: string;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
  lockExpiresAt: Date;
};

export async function claimQueueJobs({
  workerId,
  limit = 1,
  lockDurationSeconds = 300,
}: ClaimQueueJobsInput): Promise<ClaimedQueueJob[]> {
  if (!workerId.trim()) {
    throw new Error("workerId is required.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be an integer between 1 and 100.");
  }
  if (!Number.isInteger(lockDurationSeconds) || lockDurationSeconds < 1) {
    throw new Error("lockDurationSeconds must be a positive integer.");
  }

  return getPrismaClient().$transaction((transaction) =>
    transaction.$queryRaw<ClaimedQueueJob[]>(Prisma.sql`
      WITH claimable_jobs AS (
        SELECT id
        FROM queue_jobs
        WHERE (
          (status = 'queued'::"QueueJobStatus" AND scheduled_at <= NOW())
          OR (status = 'processing'::"QueueJobStatus" AND lock_expires_at <= NOW())
        )
        ORDER BY scheduled_at, created_at
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      ),
      claimed_jobs AS (
        UPDATE queue_jobs AS job
        SET
          status = 'processing'::"QueueJobStatus",
          locked_at = NOW(),
          lock_expires_at = NOW() + ${lockDurationSeconds} * INTERVAL '1 second',
          locked_by = ${workerId},
          updated_at = NOW()
        FROM claimable_jobs, email_deliveries AS delivery
        WHERE job.id = claimable_jobs.id
          AND delivery.id = job.delivery_id
        RETURNING
          job.id,
          job.delivery_id AS "deliveryId",
          delivery.idempotency_key AS "idempotencyKey",
          job.retry_count AS "retryCount",
          job.max_retries AS "maxRetries",
          job.scheduled_at AS "scheduledAt",
          job.lock_expires_at AS "lockExpiresAt"
      ),
      marked_deliveries AS (
        UPDATE email_deliveries AS delivery
        SET
          status = 'sending'::"DeliveryStatus",
          updated_at = NOW()
        FROM claimed_jobs
        WHERE delivery.id = claimed_jobs."deliveryId"
      )
      SELECT * FROM claimed_jobs
    `),
  );
}

/**
 * Returns a claimed job to the queue without counting it as an attempt.
 *
 * Used when a job cannot be worked right now — US-23 holds unsent work in the
 * queue when both provider quotas are exhausted. Without this the job would sit
 * in `processing` until its lock expired, which delays every other job behind it
 * by the lock duration for no reason.
 *
 * `retryCount` is deliberately untouched: nothing was tried, so nothing failed.
 * Incrementing it would slowly dead-letter a backlog that was only ever waiting
 * for tomorrow's quota.
 *
 * Scoped to `lockedBy` so a worker whose lock has already been stolen by another
 * cannot release the other worker's claim.
 */
export async function releaseClaimedJob({
  queueJobId,
  workerId,
}: {
  queueJobId: string;
  workerId: string;
}): Promise<boolean> {
  if (!workerId.trim()) {
    throw new Error("workerId is required.");
  }

  return getPrismaClient().$transaction(async (transaction) => {
    const job = await transaction.queueJob.findFirst({
      where: { id: queueJobId, status: "PROCESSING", lockedBy: workerId },
      select: { deliveryId: true },
    });

    if (!job) return false;

    const released = await transaction.queueJob.updateMany({
      where: { id: queueJobId, status: "PROCESSING", lockedBy: workerId },
      data: { status: "QUEUED", lockedAt: null, lockExpiresAt: null, lockedBy: null },
    });

    if (released.count === 0) return false;

    await transaction.emailDelivery.update({
      where: { id: job.deliveryId },
      data: { status: "QUEUED" },
    });

    return true;
  });
}
