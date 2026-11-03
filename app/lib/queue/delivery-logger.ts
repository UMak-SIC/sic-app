import "server-only";

import { DeliveryStatus, EmailProvider, Prisma, QueueJobStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

export type DeliveryAttemptResult = {
  provider: EmailProvider;
  succeeded: boolean;
  providerMessageId?: string;
  httpStatus?: number;
  requestPayload?: Prisma.InputJsonValue;
  responsePayload?: Prisma.InputJsonValue;
  errorMessage?: string;
};

/**
 * How long a failed send waits before it can be claimed again.
 *
 * It is longer than a worker run's claim window, so a failure is never retried
 * within the run that failed it. It is no longer than the gap between the
 * nightly cron runs minus a run's length, so the next run picks it up. See
 * `docs/cron-job-org.md`.
 */
export const RETRY_DELAY_MS = 5 * 60 * 1000;

type RecordDeliveryAttemptInput = DeliveryAttemptResult & {
  queueJobId: string;
  workerId: string;
};

export async function recordDeliveryAttempt({
  queueJobId,
  workerId,
  provider,
  succeeded,
  providerMessageId,
  httpStatus,
  requestPayload,
  responsePayload,
  errorMessage,
}: RecordDeliveryAttemptInput): Promise<{ deadLettered: boolean }> {
  return getPrismaClient().$transaction(async (transaction) => {
    const queueJob = await transaction.queueJob.findFirst({
      where: {
        id: queueJobId,
        status: QueueJobStatus.PROCESSING,
        lockedBy: workerId,
        lockExpiresAt: { gt: new Date() },
      },
      select: { deliveryId: true, retryCount: true, maxRetries: true },
    });

    if (!queueJob) {
      throw new Error(`Queue job ${queueJobId} is not claimed by worker ${workerId}.`);
    }

    // retryCount tracks failed sends, while attemptNumber is permanent delivery
    // history. A manually requeued delivery starts a new retry budget but must
    // never reuse an existing attempt number.
    const lastAttempt = await transaction.deliveryAttempt.aggregate({
      where: { deliveryId: queueJob.deliveryId },
      _max: { attemptNumber: true },
    });
    const retryCount = succeeded ? queueJob.retryCount : queueJob.retryCount + 1;
    const deadLettered = !succeeded && retryCount > queueJob.maxRetries;

    await transaction.deliveryAttempt.create({
      data: {
        deliveryId: queueJob.deliveryId,
        attemptNumber: (lastAttempt._max.attemptNumber ?? 0) + 1,
        provider,
        providerMessageId,
        httpStatus,
        requestPayload,
        responsePayload,
        errorMessage,
      },
    });

    if (succeeded) {
      await transaction.emailDelivery.update({
        where: { id: queueJob.deliveryId },
        data: {
          status: DeliveryStatus.SENT,
          provider,
          providerMessageId,
          failureCode: null,
          failureMessage: null,
          sentAt: new Date(),
        },
      });
      await transaction.queueJob.update({
        where: { id: queueJobId },
        data: {
          status: QueueJobStatus.COMPLETED,
          lockedAt: null,
          lockExpiresAt: null,
          lockedBy: null,
          lastError: null,
        },
      });

      return { deadLettered: false };
    }

    await transaction.emailDelivery.update({
      where: { id: queueJob.deliveryId },
      data: {
        status: deadLettered ? DeliveryStatus.FAILED : DeliveryStatus.QUEUED,
        provider,
        failureCode: httpStatus?.toString() ?? null,
        failureMessage: errorMessage ?? null,
      },
    });
    await transaction.queueJob.update({
      where: { id: queueJobId },
      data: {
        status: deadLettered ? QueueJobStatus.DEAD_LETTER : QueueJobStatus.QUEUED,
        retryCount,
        ...(deadLettered ? {} : { scheduledAt: new Date(Date.now() + RETRY_DELAY_MS) }),
        lockedAt: null,
        lockExpiresAt: null,
        lockedBy: null,
        lastError: errorMessage ?? null,
      },
    });

    return { deadLettered };
  });
}
