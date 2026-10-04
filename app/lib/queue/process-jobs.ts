import "server-only";

import { EmailProvider } from "@prisma/client";

import {
  claimQueueJobs,
  releaseClaimedJob,
  type ClaimedQueueJob,
} from "@/lib/queue/claim-jobs";
import {
  recordDeliveryAttempt,
  type DeliveryAttemptResult,
} from "@/lib/queue/delivery-logger";

type ProcessQueueJobsInput = {
  workerId: string;
  /**
   * `null` means the job cannot be worked right now — US-23 holds unsent work in
   * the queue when both daily provider quotas are exhausted. It is deliberately
   * not an error: the job is released, no attempt is recorded, and `retryCount`
   * is left alone so a backlog waiting for tomorrow's quota is not slowly
   * dead-lettered.
   */
  selectProvider: (job: ClaimedQueueJob) => Promise<EmailProvider | null>;
  dispatch: (
    job: ClaimedQueueJob,
    provider: EmailProvider,
  ) => Promise<Omit<DeliveryAttemptResult, "provider">>;
  limit?: number;
};

type ProcessQueueJobsResult = {
  claimed: number;
  completed: number;
  retried: number;
  deadLettered: number;
  /** Jobs returned to the queue because no provider had capacity. */
  held: number;
};

// Provider adapters return normalized results so every outbound attempt reaches
// the same transactional delivery logger.
export async function processQueueJobs({
  workerId,
  selectProvider,
  dispatch,
  limit,
}: ProcessQueueJobsInput): Promise<ProcessQueueJobsResult> {
  const jobs = await claimQueueJobs({ workerId, limit });
  const result = {
    claimed: jobs.length,
    completed: 0,
    retried: 0,
    deadLettered: 0,
    held: 0,
  };

  for (const job of jobs) {
    let provider: EmailProvider | null;

    try {
      provider = await selectProvider(job);
    } catch (error) {
      // A selector failure happens before an attempt can be attributed to a
      // provider. Release the lease immediately so a configuration fix does not
      // strand the delivery in Sending until its five-minute timeout.
      await releaseClaimedJob({ queueJobId: job.id, workerId });
      throw error;
    }

    if (provider === null) {
      // Nothing was attempted, so nothing is recorded. Releasing the claim keeps
      // the job in `queued` instead of parking it in `processing` until its lock
      // expires and holding up every job behind it.
      await releaseClaimedJob({ queueJobId: job.id, workerId });
      result.held += 1;
      continue;
    }

    let attempt: DeliveryAttemptResult;

    try {
      attempt = { provider, ...(await dispatch(job, provider)) };
    } catch (error) {
      attempt = {
        provider,
        succeeded: false,
        errorMessage: error instanceof Error ? error.message : "Provider dispatch failed.",
      };
    }

    const { deadLettered } = await recordDeliveryAttempt({
      queueJobId: job.id,
      workerId,
      ...attempt,
    });

    if (attempt.succeeded) {
      result.completed += 1;
    } else if (deadLettered) {
      result.deadLettered += 1;
    } else {
      result.retried += 1;
    }
  }

  return result;
}
