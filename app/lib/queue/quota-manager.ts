import "server-only";

import { EmailProvider } from "@prisma/client";

import { getOrganizationTimezone } from "@/lib/events/organization-timezone";
import { getPrismaClient } from "@/lib/prisma";

/**
 * Transactional daily quota reservation and Mailgun-to-Brevo failover
 * (TSK-0705, US-21, US-22, DMA-10, NFR-05).
 *
 * ## Why reservation rather than counting after the fact
 *
 * A worker that claimed ten jobs and then counted its sends would discover it
 * had blown through the daily allowance only after sending them. Reserving a slot
 * *before* dispatch means the eleventh send is refused while it is still cheap to
 * refuse, and the refusal is a routing decision rather than a provider error.
 *
 * ## What the two counters mean
 *
 * `reservedCount` is the number of slots taken for the day. It is incremented on
 * reservation and only ever decremented when a reservation is *released*, which
 * happens when a send failed and therefore consumed no provider capacity.
 *
 * `sentCount` is the subset that actually went out. It is incremented on
 * confirmation and is informational; the capacity guard reads `reservedCount`,
 * which is why a confirmed send does not give its slot back. Releasing on
 * failure is what keeps a day of provider errors from permanently exhausting the
 * quota.
 *
 * ## Concurrency
 *
 * Reservation is a compare-and-swap: the update only applies while
 * `reservedCount` is still below the limit, and Postgres re-evaluates that
 * predicate under the row lock. Two workers racing for the last slot cannot both
 * win, which a read-then-write would allow.
 */

/** Provider preference. US-21 makes Mailgun primary, US-22 makes Brevo the overflow. */
export const PROVIDER_PREFERENCE: readonly EmailProvider[] = [
  EmailProvider.MAILGUN,
  EmailProvider.BREVO,
];

const DEFAULT_DAILY_LIMITS: Record<EmailProvider, number> = {
  [EmailProvider.MAILGUN]: 100,
  [EmailProvider.BREVO]: 300,
};

const LIMIT_ENV: Record<EmailProvider, string> = {
  [EmailProvider.MAILGUN]: "MAILGUN_DAILY_LIMIT",
  [EmailProvider.BREVO]: "BREVO_DAILY_LIMIT",
};

/**
 * Upper bound on a configured allowance.
 *
 * Without one, a digit slip like `1000000000000000000000` parses to `1e21`, which
 * is a valid integer and therefore silently disables the cap. The cap is the
 * point of US-21 and US-22, so an implausible value is treated as a typo rather
 * than as an instruction to stop enforcing quota. This is far above any real
 * provider allowance and only exists to catch slips.
 */
const MAX_DAILY_LIMIT = 1_000_000;

/**
 * The configured daily cap for a provider.
 *
 * NFR-05 requires these to be configurable, with 100 and 300 as the documented
 * defaults from US-21 and US-22. A malformed or implausible value falls back to
 * the default rather than throwing, because a typo in a quota variable should
 * not take delivery down for the day.
 */
export function getDailyLimit(
  provider: EmailProvider,
  env: Record<string, string | undefined> = process.env
): number {
  const raw = env[LIMIT_ENV[provider]]?.trim();

  if (!raw) {
    return DEFAULT_DAILY_LIMITS[provider];
  }

  const parsed = Number(raw);

  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_DAILY_LIMIT) {
    return DEFAULT_DAILY_LIMITS[provider];
  }

  return parsed;
}

/**
 * The current day in the organization's timezone, as a UTC midnight.
 *
 * `usage_date` is a `Date` column, so it has to be a date rather than an
 * instant. Resetting at UTC midnight would hand a Manila campus a quota that
 * starts at 8am local time, so the organization's own calendar day is used.
 */
export function getUsageDate(now: Date = new Date()): Date {
  const yearMonthDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: getOrganizationTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return new Date(`${yearMonthDay}T00:00:00.000Z`);
}

function key(provider: EmailProvider, usageDate: Date) {
  return { provider_usageDate: { provider, usageDate } };
}

/**
 * Reserves a slot on the first provider in `order` that still has capacity.
 *
 * Returns the provider that was reserved, or `null` when every candidate is
 * exhausted — which is the caller's signal to hold the job rather than send it
 * and let the provider reject it.
 *
 * `order` lets a caller put Brevo first when Mailgun has just rate limited it,
 * without that being a special case in here.
 */
export async function reserveProviderSlot({
  order = PROVIDER_PREFERENCE,
  env = process.env,
  now = new Date(),
}: {
  order?: readonly EmailProvider[];
  env?: Record<string, string | undefined>;
  now?: Date;
} = {}): Promise<EmailProvider | null> {
  const usageDate = getUsageDate(now);

  return getPrismaClient().$transaction(async (transaction) => {
    for (const provider of order) {
      const limit = getDailyLimit(provider, env);

      // A limit of zero disables the provider entirely, which is how a provider
      // is taken out of rotation without a code change.
      if (limit === 0) {
        continue;
      }

      // Ensure the day's row exists so the guarded update below has something to
      // match. `update: {}` makes this a no-op on the second call of the day.
      await transaction.providerDailyUsage.upsert({
        where: key(provider, usageDate),
        create: { provider, usageDate },
        update: {},
      });

      const claimed = await transaction.providerDailyUsage.updateMany({
        where: { provider, usageDate, reservedCount: { lt: limit } },
        data: { reservedCount: { increment: 1 } },
      });

      if (claimed.count > 0) {
        return provider;
      }
    }

    return null;
  });
}

/**
 * Confirms a reservation was used: the send happened, so the slot stays consumed
 * and the sent tally goes up.
 */
export async function confirmProviderSend({
  provider,
  now = new Date(),
}: {
  provider: EmailProvider;
  now?: Date;
}): Promise<void> {
  const usageDate = getUsageDate(now);

  await getPrismaClient().providerDailyUsage.updateMany({
    where: { provider, usageDate },
    data: { sentCount: { increment: 1 } },
  });
}

/**
 * Returns an unused reservation, so a failed send does not permanently consume
 * capacity. `reservedCount` is floored at zero so a double release cannot drive
 * the counter negative and hand the provider more than its allowance.
 */
export async function releaseProviderReservation({
  provider,
  now = new Date(),
}: {
  provider: EmailProvider;
  now?: Date;
}): Promise<void> {
  const usageDate = getUsageDate(now);

  await getPrismaClient().providerDailyUsage.updateMany({
    where: { provider, usageDate, reservedCount: { gt: 0 } },
    data: { reservedCount: { decrement: 1 } },
  });
}

/**
 * Whether any provider still has capacity today.
 *
 * A cheap pre-flight for the worker so an exhausted day returns immediately
 * rather than claiming a batch it cannot send. The per-job reservation remains
 * the authority, because capacity can be consumed between this check and the
 * claim.
 */
export async function hasProviderCapacity({
  order = PROVIDER_PREFERENCE,
  env = process.env,
  now = new Date(),
}: {
  order?: readonly EmailProvider[];
  env?: Record<string, string | undefined>;
  now?: Date;
} = {}): Promise<boolean> {
  const usageDate = getUsageDate(now);

  const usable = order.filter((provider) => getDailyLimit(provider, env) > 0);

  if (usable.length === 0) {
    return false;
  }

  const rows = await getPrismaClient().providerDailyUsage.findMany({
    where: { provider: { in: [...usable] }, usageDate },
    select: { provider: true, reservedCount: true },
  });

  const reserved = new Map(rows.map((row) => [row.provider, row.reservedCount]));

  return usable.some((provider) => (reserved.get(provider) ?? 0) < getDailyLimit(provider, env));
}
