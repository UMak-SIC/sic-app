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

    const retryCount = succeeded ? queueJob.retryCount : queueJob.retryCount + 1;
    const deadLettered = !succeeded && retryCount > queueJob.maxRetries;

    await transaction.deliveryAttempt.create({
      data: {
        deliveryId: queueJob.deliveryId,
        attemptNumber: queueJob.retryCount + 1,
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
        lockedAt: null,
        lockExpiresAt: null,
        lockedBy: null,
        lastError: errorMessage ?? null,
      },
    });

    return { deadLettered };
  });
}
