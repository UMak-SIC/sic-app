import { beforeEach, expect, test, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ eventRosterEntry: { findMany } }),
}));

import {
  getCourseParticipation,
  UNRECORDED_COURSE,
} from "@/lib/services/participation-service";

/**
 * Participation is counted per event and per course.
 *
 * The two things worth pinning are what counts as taking part and what is left out,
 * because both are easy to get subtly wrong: counting the roster instead of the
 * attendance would report a full house for an event nobody came to, and counting
 * students who have been removed from the directory would put a number on screen that
 * contradicts the list directly above it.
 */

const EVENTS = {
  first: { id: "e-1", name: "Orientation", startsAt: new Date("2026-01-10T00:00:00.000Z") },
  second: { id: "e-2", name: "Hackathon", startsAt: new Date("2026-02-14T00:00:00.000Z") },
};

type Entry = {
  status: "PENDING" | "ATTENDED" | "ABSENT";
  event: { id: string; name: string; startsAt: Date };
  attendee: { course: string | null };
};

function entry(
  event: { id: string; name: string; startsAt: Date },
  course: string | null,
  status: Entry["status"] = "ATTENDED"
): Entry {
  return { status, event, attendee: { course } };
}

beforeEach(() => {
  vi.clearAllMocks();
  findMany.mockResolvedValue([]);
});

test("counts who was marked present, not who was on the list", async () => {
  findMany.mockResolvedValue([
    entry(EVENTS.first, "BSIT", "ATTENDED"),
    entry(EVENTS.first, "BSIT", "ABSENT"),
    entry(EVENTS.first, "BSIT", "PENDING"),
  ]);

  const result = await getCourseParticipation();

  // Three on the roster, one of them present.
  expect(result.events[0]).toMatchObject({ onRoster: 3, attended: 1 });
  expect(result.events[0].counts).toEqual({ BSIT: 1 });
  expect(result.totalAttended).toBe(1);
});

test("keeps a course with no attendance visible as zero", async () => {
  findMany.mockResolvedValue([
    entry(EVENTS.first, "BSIT"),
    entry(EVENTS.first, "BSIT"),
    entry(EVENTS.second, "BSIT"),
    entry(EVENTS.second, "BSCS"),
  ]);

  const result = await getCourseParticipation();

  // BSCS has nobody at the orientation. Leaving it out of that event would make the
  // axis have to interpolate a gap, which reads as missing data rather than a zero.
  const orientation = result.events.find((event) => event.id === EVENTS.first.id);
  expect(orientation?.counts.BSCS ?? 0).toBe(0);
  expect(result.courses).toContain("BSCS");
});

test("orders events oldest first", async () => {
  findMany.mockResolvedValue([
    entry(EVENTS.second, "BSIT"),
    entry(EVENTS.first, "BSIT"),
  ]);

  const result = await getCourseParticipation();

  expect(result.events.map((event) => event.id)).toEqual(["e-1", "e-2"]);
});

test("orders the three computing courses first, then the rest, then unrecorded", async () => {
  findMany.mockResolvedValue([
    entry(EVENTS.first, null),
    entry(EVENTS.first, "BSCS"),
    entry(EVENTS.first, "BSIT"),
    entry(EVENTS.first, "BSINS"),
    entry(EVENTS.first, "BS-IT"),
    entry(EVENTS.first, "BS Information Technology"),
  ]);

  const result = await getCourseParticipation();

  // The three codes lead, in the order the directory presents them. "BS-IT" sorts
  // with BSIT because it is the same code with punctuation. "BS Information
  // Technology" is a different stored value and is not guessed to be BSIT — it sorts
  // after the known codes rather than being merged into one.
  expect(result.courses.slice(0, 4)).toEqual(["BSIT", "BS-IT", "BSCS", "BSINS"]);
  expect(result.courses).toContain("BS Information Technology");
  expect(result.courses[result.courses.length - 1]).toBe(UNRECORDED_COURSE);
});

test("groups students whose course was never recorded rather than dropping them", async () => {
  findMany.mockResolvedValue([
    entry(EVENTS.first, null),
    entry(EVENTS.first, "   "),
    entry(EVENTS.first, "BSIT"),
  ]);

  const result = await getCourseParticipation();

  // Silently excluding them would make the totals disagree with the directory, which
  // shows those students as having no course.
  expect(result.events[0].counts[UNRECORDED_COURSE]).toBe(2);
  expect(result.totals[UNRECORDED_COURSE]).toBe(2);
  expect(result.totalAttended).toBe(3);
});

test("keeps a stored course spelled differently as its own series", async () => {
  findMany.mockResolvedValue([
    entry(EVENTS.first, "BSCS"),
    entry(EVENTS.first, "bscs"),
  ]);

  const result = await getCourseParticipation();

  // Merging them would mean deciding two spellings are the same course, which the
  // registry has not said. They are separate series and both are reported.
  expect(result.courses).toEqual(["BSCS", "bscs"]);
  expect(result.events[0].counts).toEqual({ BSCS: 1, bscs: 1 });
});

test("returns nothing to draw when no event has a roster", async () => {
  findMany.mockResolvedValue([]);

  const result = await getCourseParticipation();

  expect(result).toEqual({
    events: [],
    courses: [],
    totals: {},
    totalAttended: 0,
  });
});

test("asks the database only for students still in the directory", async () => {
  await getCourseParticipation();

  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { attendee: { deletedAt: null } } })
  );
});

test("totals every course across every event", async () => {
  findMany.mockResolvedValue([
    entry(EVENTS.first, "BSIT"),
    entry(EVENTS.first, "BSCS"),
    entry(EVENTS.second, "BSIT"),
    entry(EVENTS.second, "BSIT"),
  ]);

  const result = await getCourseParticipation();

  expect(result.totals).toEqual({ BSIT: 3, BSCS: 1 });
  expect(result.totalAttended).toBe(4);
});