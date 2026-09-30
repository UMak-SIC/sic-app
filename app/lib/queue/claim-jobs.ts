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
        FROM claimable_jobs
        WHERE job.id = claimable_jobs.id
        RETURNING
          job.id,
          job.delivery_id AS "deliveryId",
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

  const released = await getPrismaClient().$transaction((transaction) =>
    transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH released_job AS (
        UPDATE queue_jobs AS job
        SET
          status = 'queued'::"QueueJobStatus",
          locked_at = NULL,
          lock_expires_at = NULL,
          locked_by = NULL,
          updated_at = NOW()
        WHERE job.id = ${queueJobId}::uuid
          AND job.status = 'processing'::"QueueJobStatus"
          AND job.locked_by = ${workerId}
        RETURNING job.id
      )
      UPDATE email_deliveries AS delivery
      SET
        status = 'queued'::"DeliveryStatus",
        updated_at = NOW()
      FROM released_job
      WHERE delivery.id = released_job."deliveryId"
      RETURNING released_job.id
    `),
  );

  return released.length > 0;
}
