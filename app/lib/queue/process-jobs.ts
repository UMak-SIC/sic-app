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
  /** Total jobs this run may claim. Defaults to 1. */
  limit?: number;
  /** Jobs sent at the same time. Bounded by the database pool. Defaults to 1. */
  concurrency?: number;
  /**
   * Epoch milliseconds after which no further batch is claimed. The batch in
   * flight still finishes, so the caller must leave headroom before the
   * platform's own timeout.
   */
  claimDeadline?: number;
};

type ProcessQueueJobsResult = {
  claimed: number;
  completed: number;
  retried: number;
  deadLettered: number;
  /** Jobs returned to the queue because no provider had capacity. */
  held: number;
};

/**
 * Claims are taken in small batches rather than all at once. Each batch gets a
 * fresh lease, so a 300-job run never outlives the lease of a job it claimed at
 * the start, and a run that stops at its deadline leaves little claimed work
 * behind.
 */
const BATCH_SIZE_PER_SLOT = 2;

// Provider adapters return normalized results so every outbound attempt reaches
// the same transactional delivery logger.
export async function processQueueJobs({
  workerId,
  selectProvider,
  dispatch,
  limit = 1,
  concurrency = 1,
  claimDeadline = Number.POSITIVE_INFINITY,
}: ProcessQueueJobsInput): Promise<ProcessQueueJobsResult> {
  const result = { claimed: 0, completed: 0, retried: 0, deadLettered: 0, held: 0 };
  const batchSize = Math.max(1, concurrency) * BATCH_SIZE_PER_SLOT;

  while (result.claimed < limit && Date.now() < claimDeadline) {
    const jobs = await claimQueueJobs({
      workerId,
      limit: Math.min(batchSize, limit - result.claimed),
    });

    if (jobs.length === 0) break;

    result.claimed += jobs.length;
    const heldBefore = result.held;

    await runWithConcurrency(jobs, concurrency, (job) =>
      processJob(job, { workerId, selectProvider, dispatch, result }),
    );

    // A held job went straight back to `queued`, so claiming again would only
    // pick it up and hold it again. Quota is spent for the day; stop here.
    if (result.held > heldBefore) break;
  }

  return result;
}

async function processJob(
  job: ClaimedQueueJob,
  {
    workerId,
    selectProvider,
    dispatch,
    result,
  }: Pick<ProcessQueueJobsInput, "workerId" | "selectProvider" | "dispatch"> & {
    result: ProcessQueueJobsResult;
  },
): Promise<void> {
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
    return;
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

/**
 * Runs `work` over `items` with at most `concurrency` in flight.
 *
 * The first error stops new items from starting, waits for the ones already in
 * flight so none is abandoned mid-send, and is then re-thrown.
 */
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  work: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  let failure: { error: unknown } | undefined;

  const slot = async () => {
    while (!failure && next < items.length) {
      const item = items[next++];

      try {
        await work(item);
      } catch (error) {
        failure ??= { error };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, slot));

  if (failure) throw failure.error;
}
