import { afterEach, expect, test, vi } from "vitest";

const { getPrismaClient, requireQueueWorker } = vi.hoisted(() => ({
  getPrismaClient: vi.fn(),
  requireQueueWorker: vi.fn(),
}));

vi.mock("@/lib/auth/require-queue-worker", () => ({ requireQueueWorker }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient }));

import { POST } from "@/app/api/internal/queue-jobs/route";

const queueJob = {
  upsert: vi.fn(),
};
const emailDelivery = {
  findUnique: vi.fn(),
};

function queueJobRequest(body: BodyInit | null, secret = true): Request {
  return new Request("http://localhost/api/internal/queue-jobs", {
    method: "POST",
    headers: secret ? { "X-Queue-Worker-Secret": "queue-worker-secret" } : undefined,
    body,
  });
}

afterEach(() => {
  vi.resetAllMocks();
  getPrismaClient.mockReturnValue({ emailDelivery, queueJob });
  requireQueueWorker.mockReturnValue(undefined);
});

test("rejects an unauthenticated request before parsing its body or writing a job", async () => {
  requireQueueWorker.mockReturnValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

  const response = await POST(queueJobRequest("not JSON", false));

  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  expect(getPrismaClient).not.toHaveBeenCalled();
  expect(queueJob.upsert).not.toHaveBeenCalled();
});

test("creates a queue job for an authenticated request", async () => {
  emailDelivery.findUnique.mockResolvedValue({ id: "delivery-id" });
  queueJob.upsert.mockResolvedValue({ id: "queue-job-id" });
  const deliveryId = "9fdcd48a-170a-4af7-862e-a511ad9d7b94";

  const response = await POST(queueJobRequest(JSON.stringify({ deliveryId })));

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ queueJobId: "queue-job-id" });
  expect(queueJob.upsert).toHaveBeenCalledWith({
    where: { deliveryId },
    create: { deliveryId },
    update: {},
    select: { id: true },
  });
});

test("uses the queue job unique delivery key for duplicate requests", async () => {
  const deliveryId = "9fdcd48a-170a-4af7-862e-a511ad9d7b94";
  emailDelivery.findUnique.mockResolvedValue({ id: "delivery-id" });
  queueJob.upsert.mockResolvedValue({ id: "existing-queue-job-id" });

  const response = await POST(queueJobRequest(JSON.stringify({ deliveryId })));

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ queueJobId: "existing-queue-job-id" });
  expect(queueJob.upsert).toHaveBeenCalledWith({
    where: { deliveryId },
    create: { deliveryId },
    update: {},
    select: { id: true },
  });
});

test("rejects an invalid delivery identifier without creating a job", async () => {
  const response = await POST(queueJobRequest(JSON.stringify({ deliveryId: "not-a-uuid" })));

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: "deliveryId must be a UUID." });
  expect(getPrismaClient).not.toHaveBeenCalled();
  expect(queueJob.upsert).not.toHaveBeenCalled();
});

test("rejects an unknown delivery without creating a queue job", async () => {
  emailDelivery.findUnique.mockResolvedValue(null);
  const deliveryId = "9fdcd48a-170a-4af7-862e-a511ad9d7b94";

  const response = await POST(queueJobRequest(JSON.stringify({ deliveryId })));

  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: "Delivery not found." });
  expect(queueJob.upsert).not.toHaveBeenCalled();
});
