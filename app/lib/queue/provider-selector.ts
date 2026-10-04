import "server-only";

import { EmailProvider } from "@prisma/client";

import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";
import { PROVIDER_PREFERENCE, reserveProviderSlot } from "@/lib/queue/quota-manager";

/**
 * Chooses which provider sends a claimed job, reserving a slot as it decides.
 *
 * TSK-0705 makes this the quota-aware selector: it reserves against
 * `provider_daily_usage` and returns `null` when no provider has capacity, which
 * the queue treats as "hold this job" per US-23.
 *
 * Brevo is the only configured delivery provider.
 */
export async function selectProviderForJob(
  _job: ClaimedQueueJob,
  env: Record<string, string | undefined> = process.env
): Promise<EmailProvider | null> {
  return reserveProviderSlot({ order: PROVIDER_PREFERENCE, env });
}
