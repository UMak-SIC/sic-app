import "server-only";

export function getOrganizationTimezone(): string {
  const timezone = process.env.ORGANIZATION_TIMEZONE?.trim();

  if (!timezone) {
    throw new Error("ORGANIZATION_TIMEZONE is required.");
  }

  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: timezone }).resolvedOptions()
      .timeZone;
  } catch {
    throw new Error("ORGANIZATION_TIMEZONE must be a valid IANA timezone.");
  }
}

/**
 * The current day in the organization's timezone, as a UTC midnight.
 *
 * Prisma reads and writes `@db.Date` columns as UTC midnights, so this value
 * compares directly with them. Using the UTC calendar day instead would end a
 * Manila day at 8am local time.
 */
export function getOrganizationDate(now: Date = new Date()): Date {
  const yearMonthDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: getOrganizationTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return new Date(`${yearMonthDay}T00:00:00.000Z`);
}

export function formatOrganizationDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: getOrganizationTimezone(),
  }).format(date);
}
