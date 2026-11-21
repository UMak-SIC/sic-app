/**
 * Date and time labels for the public site, in the organization timezone
 * (PS-02, PS-04, PS-05). The timezone is passed in so these stay pure; pages get
 * it from getOrganizationTimezone().
 */

import { dateKey } from "./calendar";

export function formatEventDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(instant);
}

export function formatShortDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(instant);
}

function time(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(instant);
}

function dayAndTime(instant: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(
    instant,
  );
  return `${day}, ${time(instant, timeZone)}`;
}

/** "9:00 AM to 12:30 PM", or both days when the event runs past midnight. */
export function formatEventTime(startsAt: Date, endsAt: Date, timeZone: string): string {
  if (dateKey(startsAt, timeZone) === dateKey(endsAt, timeZone)) {
    return `${time(startsAt, timeZone)} to ${time(endsAt, timeZone)}`;
  }
  return `${dayAndTime(startsAt, timeZone)} to ${dayAndTime(endsAt, timeZone)}`;
}

/** A stored calendar date (`@db.Date`, read as a UTC midnight) such as a news post date. */
export function formatPostDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** The timezone's name for labels, such as "Philippine Standard Time". */
export function formatZoneName(instant: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "long" })
    .formatToParts(instant)
    .find((item) => item.type === "timeZoneName");
  return part?.value ?? timeZone;
}
