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

export function formatOrganizationDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: getOrganizationTimezone(),
  }).format(date);
}
