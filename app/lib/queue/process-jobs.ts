import "server-only";

import { EmailProvider } from "@prisma/client";

import { claimQueueJobs, type ClaimedQueueJob } from "@/lib/queue/claim-jobs";
import {
  recordDeliveryAttempt,
  type DeliveryAttemptResult,
} from "@/lib/queue/delivery-logger";

type ProcessQueueJobsInput = {
  workerId: string;
  selectProvider: (job: ClaimedQueueJob) => Promise<EmailProvider>;
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
  };

  for (const job of jobs) {
    const provider = await selectProvider(job);
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
