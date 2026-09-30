import "server-only";

import { EmailProvider } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";
import { PROVIDER_PREFERENCE, reserveProviderSlot } from "@/lib/queue/quota-manager";

/**
 * Chooses which provider sends a claimed job, reserving a slot as it decides.
 *
 * TSK-0705 makes this the quota-aware selector: it reserves against
 * `provider_daily_usage` and returns `null` when no provider has capacity, which
 * the queue treats as "hold this job" per US-23.
 *
 * Ordering starts from US-21 (Mailgun primary) and US-22 (Brevo overflow), but a
 * provider the last attempt just rate limited is pushed behind the other. That is
 * a courtesy rather than the quota decision â€” without it, every remaining job in
 * the batch would repeat the same 429 before falling through to a provider that
 * may have capacity anyway.
 */
export async function selectProviderForJob(
  job: ClaimedQueueJob,
  env: Record<string, string | undefined> = process.env
): Promise<EmailProvider | null> {
  const lastAttempt = await getPrismaClient().deliveryAttempt.findFirst({
    // DeliveryAttempt links to the delivery, not the job: recordDeliveryAttempt
    // takes a queueJobId and resolves the deliveryId through the job row.
    where: { deliveryId: job.deliveryId },
    orderBy: { attemptedAt: "desc" },
    select: { provider: true, httpStatus: true },
  });

  const preferred = PROVIDER_PREFERENCE[0];
  const rateLimitedPrimary =
    lastAttempt?.httpStatus === 429 && lastAttempt.provider === preferred;

  const order = rateLimitedPrimary
    ? [
        ...PROVIDER_PREFERENCE.filter((provider) => provider !== preferred),
        preferred,
      ]
    : PROVIDER_PREFERENCE;

  return reserveProviderSlot({ order, env });
}
