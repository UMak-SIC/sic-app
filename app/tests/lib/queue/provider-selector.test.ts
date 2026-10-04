import { beforeEach, expect, test, vi } from "vitest";
import { EmailProvider } from "@prisma/client";

const { reserveProviderSlot } = vi.hoisted(() => ({ reserveProviderSlot: vi.fn() }));

vi.mock("@/lib/queue/quota-manager", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue/quota-manager")>();
  return { ...actual, reserveProviderSlot };
});

import { selectProviderForJob } from "@/lib/queue/provider-selector";
import { PROVIDER_PREFERENCE } from "@/lib/queue/quota-manager";
import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";

const job: ClaimedQueueJob = {
  id: "job-1",
  deliveryId: "delivery-1",
  retryCount: 1,
  maxRetries: 3,
  scheduledAt: new Date("2026-09-30T10:00:00.000Z"),
  lockExpiresAt: new Date("2026-09-30T10:05:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  reserveProviderSlot.mockResolvedValue(EmailProvider.BREVO);
});

test("reserves a Brevo slot rather than returning a provider blindly", async () => {
  await selectProviderForJob(job, {});

  expect(reserveProviderSlot).toHaveBeenCalledWith({ order: PROVIDER_PREFERENCE, env: {} });
});

test("returns the provider whose reservation was secured", async () => {
  await expect(selectProviderForJob(job, {})).resolves.toBe(EmailProvider.BREVO);
});

test("passes through the exhausted case so the queue can hold the job", async () => {
  reserveProviderSlot.mockResolvedValue(null);

  await expect(selectProviderForJob(job, {})).resolves.toBeNull();
});
