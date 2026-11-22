/**
 * Month arithmetic for the public calendar (PS-04), in the organization timezone.
 *
 * Pure functions with no Intl state outside their arguments, so the server page
 * and the unit tests agree on which day an event falls on.
 */

export type MonthRef = { year: number; month: number };

export type CalendarEvent = { id: string; name: string; startsAt: Date };

export type CalendarDay = {
  key: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
};

const MONTH_PARAM = /^(\d{4})-(\d{2})$/;

export function parseMonthParam(value: string | undefined, fallback: MonthRef): MonthRef {
  const match = value ? MONTH_PARAM.exec(value) : null;
  if (!match) return fallback;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return fallback;

  return { year, month };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthParam({ year, month }: MonthRef): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** The calendar date ("2026-12-05") of an instant in a timezone. */
export function dateKey(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** The month an instant falls in, in a timezone. */
export function monthOf(instant: Date, timeZone: string): MonthRef {
  const [year, month] = dateKey(instant, timeZone).split("-").map(Number);
  return { year, month };
}

/** Minutes the timezone is ahead of UTC at an instant. */
function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** The instant of midnight starting a calendar day in a timezone. */
function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - offsetMinutes(new Date(guess), timeZone) * 60_000;
  // A second pass settles days where the offset changes (daylight saving).
  return new Date(guess - offsetMinutes(new Date(first), timeZone) * 60_000);
}

/** The instants bounding a month in a timezone: [start, end). */
export function monthRange(ref: MonthRef, timeZone: string): { start: Date; end: Date } {
  const next = shiftMonth(ref, 1);
  return {
    start: zonedMidnight(ref.year, ref.month, 1, timeZone),
    end: zonedMidnight(next.year, next.month, 1, timeZone),
  };
}

/**
 * Whole weeks, Sunday first, covering the month. Each event appears on the day it
 * starts in the organization timezone.
 */
export function buildMonthGrid(
  ref: MonthRef,
  events: CalendarEvent[],
  timeZone: string,
  now: Date,
): CalendarDay[][] {
  const todayKey = dateKey(now, timeZone);
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of [...events].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())) {
    const key = dateKey(event.startsAt, timeZone);
    byDay.set(key, [...(byDay.get(key) ?? []), event]);
  }

  // Plain calendar arithmetic on UTC dates: no instants, so no timezone drift.
  const first = new Date(Date.UTC(ref.year, ref.month - 1, 1));
  const daysInMonth = new Date(Date.UTC(ref.year, ref.month, 0)).getUTCDate();
  const leading = first.getUTCDay();
  const cells = Math.ceil((leading + daysInMonth) / 7) * 7;

  const days: CalendarDay[] = [];
  for (let index = 0; index < cells; index += 1) {
    const date = new Date(Date.UTC(ref.year, ref.month - 1, 1 - leading + index));
    const key = date.toISOString().slice(0, 10);
    days.push({
      key,
      dayOfMonth: date.getUTCDate(),
      inMonth: date.getUTCMonth() === ref.month - 1,
      isToday: key === todayKey,
      events: byDay.get(key) ?? [],
    });
  }

  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  return weeks;
}
