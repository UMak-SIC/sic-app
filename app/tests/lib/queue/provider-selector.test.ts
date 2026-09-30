import { beforeEach, expect, test, vi } from "vitest";
import { EmailProvider } from "@prisma/client";

const { findFirst, reserveProviderSlot } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  reserveProviderSlot: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ deliveryAttempt: { findFirst } }),
}));

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
  findFirst.mockResolvedValue(null);
  reserveProviderSlot.mockResolvedValue(EmailProvider.MAILGUN);
});

test("reserves a slot rather than returning a provider blindly", async () => {
  // The selector is where quota is claimed; returning a provider without
  // reserving is how the allowance would be blown past.
  await selectProviderForJob(job, {});

  expect(reserveProviderSlot).toHaveBeenCalledWith({ order: PROVIDER_PREFERENCE, env: {} });
});

test("returns whatever provider the reservation secured", async () => {
  reserveProviderSlot.mockResolvedValue(EmailProvider.BREVO);

  await expect(selectProviderForJob(job, {})).resolves.toBe(EmailProvider.BREVO);
});

test("passes through the exhausted case so the queue can hold the job", async () => {
  reserveProviderSlot.mockResolvedValue(null);

  await expect(selectProviderForJob(job, {})).resolves.toBeNull();
});

test("looks up the attempt through the delivery, not the job", async () => {
  // DeliveryAttempt has no queueJobId; recordDeliveryAttempt resolves the
  // deliveryId from the job row.
  await selectProviderForJob(job, {});

  expect(findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: { deliveryId: "delivery-1" } })
  );
});

test("puts Brevo first after Mailgun rate limits", async () => {
  // Without this, every remaining job in the batch would repeat the same 429
  // before falling through.
  findFirst.mockResolvedValue({ provider: EmailProvider.MAILGUN, httpStatus: 429 });

  await selectProviderForJob(job, {});

  expect(reserveProviderSlot).toHaveBeenCalledWith({
    order: [EmailProvider.BREVO, EmailProvider.MAILGUN],
    env: {},
  });
});

test("keeps Mailgun first after Brevo rate limits", async () => {
  // The overflow provider being throttled says nothing about the primary, and
  // going back to it is the default preference anyway.
  findFirst.mockResolvedValue({ provider: EmailProvider.BREVO, httpStatus: 429 });

  await selectProviderForJob(job, {});

  expect(reserveProviderSlot).toHaveBeenCalledWith({ order: PROVIDER_PREFERENCE, env: {} });
});

test("keeps Mailgun first after an ordinary failure", async () => {
  findFirst.mockResolvedValue({ provider: EmailProvider.MAILGUN, httpStatus: 401 });

  await selectProviderForJob(job, {});

  expect(reserveProviderSlot).toHaveBeenCalledWith({ order: PROVIDER_PREFERENCE, env: {} });
});

test("keeps Mailgun first after a server error", async () => {
  findFirst.mockResolvedValue({ provider: EmailProvider.MAILGUN, httpStatus: 502 });

  await selectProviderForJob(job, {});

  expect(reserveProviderSlot).toHaveBeenCalledWith({ order: PROVIDER_PREFERENCE, env: {} });
});
