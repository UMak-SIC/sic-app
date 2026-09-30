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
