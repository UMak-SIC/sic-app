import "server-only";

import { DeliveryStatus, EmailProvider, Prisma, QueueJobStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

type RecordDeliveryAttemptInput = {
  queueJobId: string;
  provider: EmailProvider;
  succeeded: boolean;
  providerMessageId?: string;
  httpStatus?: number;
  requestPayload?: Prisma.InputJsonValue;
  responsePayload?: Prisma.InputJsonValue;
  errorMessage?: string;
};

export async function recordDeliveryAttempt({
  queueJobId,
  provider,
  succeeded,
  providerMessageId,
  httpStatus,
  requestPayload,
  responsePayload,
  errorMessage,
}: RecordDeliveryAttemptInput): Promise<{ deadLettered: boolean }> {
  return getPrismaClient().$transaction(async (transaction) => {
    const queueJob = await transaction.queueJob.findUnique({
      where: { id: queueJobId },
      select: { deliveryId: true, retryCount: true, maxRetries: true },
    });

    if (!queueJob) {
      throw new Error(`Queue job ${queueJobId} was not found.`);
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
