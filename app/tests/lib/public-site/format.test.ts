import { expect, test } from "vitest";

import { formatEventDate, formatEventTime, formatPostDate } from "@/lib/public-site/format";

const MANILA = "Asia/Manila";

test("writes event dates and times in the organization timezone", () => {
  const startsAt = new Date("2026-12-05T01:00:00.000Z");
  const endsAt = new Date("2026-12-05T04:30:00.000Z");

  expect(formatEventDate(startsAt, MANILA)).toBe("Saturday, December 5, 2026");
  expect(formatEventTime(startsAt, endsAt, MANILA)).toBe("9:00 AM to 12:30 PM");
});

test("names both days when an event runs past midnight", () => {
  const startsAt = new Date("2026-12-05T10:00:00.000Z");
  const endsAt = new Date("2026-12-06T02:00:00.000Z");

  expect(formatEventTime(startsAt, endsAt, MANILA)).toBe("Dec 5, 6:00 PM to Dec 6, 10:00 AM");
});

test("writes a stored calendar date without shifting it a day", () => {
  // Prisma returns @db.Date values as UTC midnights.
  expect(formatPostDate(new Date("2026-11-21T00:00:00.000Z"))).toBe("November 21, 2026");
});
