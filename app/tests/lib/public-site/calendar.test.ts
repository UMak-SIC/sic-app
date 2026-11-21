import { expect, test } from "vitest";

import {
  buildMonthGrid,
  monthParam,
  monthRange,
  parseMonthParam,
  shiftMonth,
} from "@/lib/public-site/calendar";

const MANILA = "Asia/Manila";

test("reads a month from the address and falls back to the current month", () => {
  const today = { year: 2026, month: 11 };

  expect(parseMonthParam("2027-02", today)).toEqual({ year: 2027, month: 2 });
  expect(parseMonthParam(undefined, today)).toEqual(today);
  expect(parseMonthParam("2027-13", today)).toEqual(today);
  expect(parseMonthParam("next month", today)).toEqual(today);
  expect(parseMonthParam("1899-05", today)).toEqual(today);
});

test("moves across year boundaries and writes the address form", () => {
  expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  expect(shiftMonth({ year: 2027, month: 1 }, -1)).toEqual({ year: 2026, month: 12 });
  expect(monthParam({ year: 2027, month: 3 })).toBe("2027-03");
});

test("bounds a month by midnight in the organization timezone", () => {
  const { start, end } = monthRange({ year: 2026, month: 12 }, MANILA);

  // Midnight on 1 Dec in Manila is 16:00 on 30 Nov in UTC.
  expect(start.toISOString()).toBe("2026-11-30T16:00:00.000Z");
  expect(end.toISOString()).toBe("2026-12-31T16:00:00.000Z");
});

test("lays out whole weeks from Sunday and marks today", () => {
  const weeks = buildMonthGrid(
    { year: 2026, month: 12 },
    [],
    MANILA,
    new Date("2026-12-15T02:00:00.000Z"),
  );

  // December 2026 starts on a Tuesday and ends on a Thursday.
  expect(weeks).toHaveLength(5);
  expect(weeks.every((week) => week.length === 7)).toBe(true);
  expect(weeks[0][0]).toMatchObject({ key: "2026-11-29", inMonth: false });
  expect(weeks[0][2]).toMatchObject({ key: "2026-12-01", dayOfMonth: 1, inMonth: true });
  expect(weeks[4][6]).toMatchObject({ key: "2027-01-02", inMonth: false });

  const today = weeks.flat().filter((day) => day.isToday);
  expect(today.map((day) => day.key)).toEqual(["2026-12-15"]);
});

test("places each event on its start day in the organization timezone", () => {
  const events = [
    // 23:30 on 4 Dec in Manila is still 4 Dec there, though it is 15:30 UTC.
    { id: "late", name: "Night Hack", startsAt: new Date("2026-12-04T15:30:00.000Z") },
    // 00:30 on 5 Dec in Manila is still 4 Dec in UTC.
    { id: "early", name: "Sunrise Run", startsAt: new Date("2026-12-04T16:30:00.000Z") },
  ];

  const days = buildMonthGrid({ year: 2026, month: 12 }, events, MANILA, new Date()).flat();

  expect(days.find((day) => day.key === "2026-12-04")?.events.map((e) => e.id)).toEqual(["late"]);
  expect(days.find((day) => day.key === "2026-12-05")?.events.map((e) => e.id)).toEqual(["early"]);
});

test("handles a leap-year February", () => {
  const days = buildMonthGrid({ year: 2028, month: 2 }, [], MANILA, new Date()).flat();

  expect(days.filter((day) => day.inMonth)).toHaveLength(29);
});
