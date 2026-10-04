import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { getPrismaClient } = vi.hoisted(() => ({ getPrismaClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ getPrismaClient }));

import { EmailProvider } from "@prisma/client";

import { recordDeliveryAttempt } from "@/lib/queue/delivery-logger";

const deliveryAttempt = { aggregate: vi.fn(), create: vi.fn() };
const emailDelivery = { update: vi.fn() };
const queueJob = { findFirst: vi.fn(), update: vi.fn() };
const transaction = { deliveryAttempt, emailDelivery, queueJob };
const database = { $transaction: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  getPrismaClient.mockReturnValue(database);
  database.$transaction.mockImplementation(async (operation) => operation(transaction));
  deliveryAttempt.aggregate.mockResolvedValue({ _max: { attemptNumber: null } });
});

afterEach(() => {
  vi.resetAllMocks();
});

test("records a successful attempt and marks the email delivery sent", async () => {
  queueJob.findFirst.mockResolvedValue({ deliveryId: "delivery-id", retryCount: 0, maxRetries: 3 });

  await expect(
    recordDeliveryAttempt({
      queueJobId: "queue-job-id",
      workerId: "worker-a",
       provider: EmailProvider.BREVO,
      succeeded: true,
       providerMessageId: "brevo-message-id",
      httpStatus: 200,
    }),
  ).resolves.toEqual({ deadLettered: false });

  expect(queueJob.findFirst).toHaveBeenCalledWith({
    where: {
      id: "queue-job-id",
      status: "PROCESSING",
      lockedBy: "worker-a",
      lockExpiresAt: { gt: expect.any(Date) },
    },
    select: { deliveryId: true, retryCount: true, maxRetries: true },
  });

  expect(deliveryAttempt.create).toHaveBeenCalledWith({
    data: {
      deliveryId: "delivery-id",
      attemptNumber: 1,
       provider: EmailProvider.BREVO,
       providerMessageId: "brevo-message-id",
      httpStatus: 200,
      requestPayload: undefined,
      responsePayload: undefined,
      errorMessage: undefined,
    },
  });
  expect(emailDelivery.update).toHaveBeenCalledWith({
    where: { id: "delivery-id" },
    data: {
      status: "SENT",
       provider: EmailProvider.BREVO,
       providerMessageId: "brevo-message-id",
      failureCode: null,
      failureMessage: null,
      sentAt: expect.any(Date),
    },
  });
  expect(queueJob.update).toHaveBeenCalledWith({
    where: { id: "queue-job-id" },
    data: {
      status: "COMPLETED",
      lockedAt: null,
      lockExpiresAt: null,
      lockedBy: null,
      lastError: null,
    },
  });
});

test("returns a failed delivery to the queue while retries remain", async () => {
  queueJob.findFirst.mockResolvedValue({ deliveryId: "delivery-id", retryCount: 2, maxRetries: 3 });

  await expect(
    recordDeliveryAttempt({
      queueJobId: "queue-job-id",
      workerId: "worker-a",
      provider: EmailProvider.BREVO,
      succeeded: false,
      httpStatus: 503,
      errorMessage: "Provider unavailable",
    }),
  ).resolves.toEqual({ deadLettered: false });

  expect(emailDelivery.update).toHaveBeenCalledWith({
    where: { id: "delivery-id" },
    data: {
      status: "QUEUED",
      provider: EmailProvider.BREVO,
      failureCode: "503",
      failureMessage: "Provider unavailable",
    },
  });
  expect(queueJob.update).toHaveBeenCalledWith({
    where: { id: "queue-job-id" },
    data: {
      status: "QUEUED",
      retryCount: 3,
      lockedAt: null,
      lockExpiresAt: null,
      lockedBy: null,
      lastError: "Provider unavailable",
    },
  });
});

test("continues delivery attempt numbering after a manual requeue", async () => {
  queueJob.findFirst.mockResolvedValue({ deliveryId: "delivery-id", retryCount: 0, maxRetries: 3 });
  deliveryAttempt.aggregate.mockResolvedValue({ _max: { attemptNumber: 1 } });

  await recordDeliveryAttempt({
    queueJobId: "queue-job-id",
    workerId: "worker-a",
    provider: EmailProvider.BREVO,
    succeeded: true,
    httpStatus: 201,
  });

  expect(deliveryAttempt.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ attemptNumber: 2 }),
    }),
  );
});

test("moves a delivery to the dead-letter queue after more than three retries", async () => {
  queueJob.findFirst.mockResolvedValue({ deliveryId: "delivery-id", retryCount: 3, maxRetries: 3 });

  await expect(
    recordDeliveryAttempt({
      queueJobId: "queue-job-id",
      workerId: "worker-a",
      provider: EmailProvider.BREVO,
      succeeded: false,
      httpStatus: 500,
      errorMessage: "Provider error",
    }),
  ).resolves.toEqual({ deadLettered: true });

  expect(emailDelivery.update).toHaveBeenCalledWith({
    where: { id: "delivery-id" },
    data: {
      status: "FAILED",
      provider: EmailProvider.BREVO,
      failureCode: "500",
      failureMessage: "Provider error",
    },
  });
  expect(queueJob.update).toHaveBeenCalledWith({
    where: { id: "queue-job-id" },
    data: {
      status: "DEAD_LETTER",
      retryCount: 4,
      lockedAt: null,
      lockExpiresAt: null,
      lockedBy: null,
      lastError: "Provider error",
    },
  });
});
