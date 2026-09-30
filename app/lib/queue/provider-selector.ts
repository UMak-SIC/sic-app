import "server-only";

import { EmailProvider } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";

/**
 * Chooses which provider sends a claimed job.
 *
 * `processQueueJobs` takes this by injection, so something has to supply it
 * before the queue can run at all.
 *
 * **This is not the failover engine.** US-21 and US-22 assign quota accounting
 * and the primary/overflow decision to TSK-0705, and `ProviderDailyUsage` exists
 * for it. What lives here is the smallest decision that lets the queue run and
 * that does something useful in the meantime: send via Mailgun, and fall back to
 * Brevo when the delivery's most recent attempt shows Mailgun was rate limiting.
 *
 * That signal is the provider's own `httpStatus`, which the adapters already
 * report as 429. Reading it is a heuristic, not quota accounting — a deployment
 * could exhaust its daily Mailgun allowance without ever seeing a 429 — so this
 * should be replaced by the engine rather than grown into one.
 */

/** Providers in preference order. */
const PRIMARY: EmailProvider = EmailProvider.MAILGUN;
const OVERFLOW: EmailProvider = EmailProvider.BREVO;

export async function selectProviderForJob(
  job: ClaimedQueueJob
): Promise<EmailProvider> {
  // DeliveryAttempt links to the delivery, not the job: `recordDeliveryAttempt`
  // takes a queueJobId and resolves the deliveryId through the job row.
  const lastAttempt = await getPrismaClient().deliveryAttempt.findFirst({
    where: { deliveryId: job.deliveryId },
    orderBy: { attemptedAt: "desc" },
    select: { provider: true, httpStatus: true },
  });

  if (lastAttempt?.provider === PRIMARY && lastAttempt.httpStatus === 429) {
    return OVERFLOW;
  }

  return PRIMARY;
}
