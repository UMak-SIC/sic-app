import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { EmailProvider } from "@prisma/client";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ deliveryAttempt: { findFirst } }),
}));

import { selectProviderForJob } from "@/lib/queue/provider-selector";
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
});

afterEach(() => {
  vi.resetAllMocks();
});

test("sends via Mailgun when there is no previous attempt", async () => {
  expect(await selectProviderForJob(job)).toBe(EmailProvider.MAILGUN);
});

test("looks up the attempt through the delivery, not the job", async () => {
  // DeliveryAttempt has no queueJobId; recordDeliveryAttempt resolves the
  // deliveryId from the job row.
  await selectProviderForJob(job);

  expect(findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: { deliveryId: "delivery-1" } })
  );
});

test("falls back to Brevo after Mailgun rate limits", async () => {
  findFirst.mockResolvedValue({
    provider: EmailProvider.MAILGUN,
    httpStatus: 429,
  });

  expect(await selectProviderForJob(job)).toBe(EmailProvider.BREVO);
});

test("stays on Mailgun after an ordinary failure", async () => {
  findFirst.mockResolvedValue({ provider: EmailProvider.MAILGUN, httpStatus: 401 });

  expect(await selectProviderForJob(job)).toBe(EmailProvider.MAILGUN);
});

test("stays on Mailgun after a server error", async () => {
  findFirst.mockResolvedValue({ provider: EmailProvider.MAILGUN, httpStatus: 502 });

  expect(await selectProviderForJob(job)).toBe(EmailProvider.MAILGUN);
});

test("does not flip providers based on Brevo's own rate limiting", async () => {
  // A 429 from the overflow provider means the overflow is exhausted too;
  // returning Mailgun would just burn the primary's remaining quota.
  findFirst.mockResolvedValue({ provider: EmailProvider.BREVO, httpStatus: 429 });

  expect(await selectProviderForJob(job)).toBe(EmailProvider.MAILGUN);
});
