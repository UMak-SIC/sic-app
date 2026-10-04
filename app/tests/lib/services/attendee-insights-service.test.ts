import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { queryRaw, transaction } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  transaction: vi.fn(),
}));

// Two queries, read together: the per-course figures and the per-event axis. Both
// promises are built before the transaction runs, so the stub resolves whatever
// `$queryRaw` was queued to return for each.
vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ $queryRaw: queryRaw, $transaction: transaction }),
}));

import { getCourseParticipation } from "@/lib/services/attendee-insights-service";

/**
 * Course participation, the aggregate behind the directory's insights card.
 *
 * `course` is free text, so these tests are mostly about not pretending it is a set of
 * three: a value nobody recognises has to survive to the caller as itself.
 */

type CourseDbRow = {
  course: string;
  students: number;
  roster_entries: number;
  attended_check_ins: number;
};

type EventDbRow = {
  event_id: string;
  event_name: string;
  event_starts_at: Date;
  course: string;
  roster_entries: number;
  attended_check_ins: number;
};

const ORIENTATION = {
  event_id: "e-1",
  event_name: "Orientation",
  event_starts_at: new Date("2026-01-10T00:00:00.000Z"),
};

const HACKATHON = {
  event_id: "e-2",
  event_name: "Hackathon",
  event_starts_at: new Date("2026-02-14T00:00:00.000Z"),
};

/** The per-course query's rows; the per-event query returns nothing. */
function returns(...rows: CourseDbRow[]) {
  queryRaw.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);
}

/** The per-event query's rows, for the chart's axis. */
function withEvents(...rows: EventDbRow[]) {
  queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce(rows);
}

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
    Promise.all(operations)
  );
  queryRaw.mockResolvedValue([]);
});

afterEach(() => {
  vi.resetAllMocks();
});

test("keeps each stored course value as itself", async () => {
  // "BS Information Technology" and "BSIT" are different strings somebody wrote. The
  // insight a registrar export is for is exactly which of them is in use.
  returns(
    { course: "BS Information Technology", students: 4, roster_entries: 8, attended_check_ins: 4 },
    { course: "BSIT", students: 2, roster_entries: 2, attended_check_ins: 1 },
  );

  const result = await getCourseParticipation();

  expect(result.courses.map((row) => row.course)).toEqual([
    "BS Information Technology",
    "BSIT",
  ]);
  expect(result.totals.courseCount).toBe(2);
  expect(result.totals.students).toBe(6);
});

test("counts students whose course was never recorded", async () => {
  returns({ course: "", students: 3, roster_entries: 0, attended_check_ins: 0 });

  const result = await getCourseParticipation();

  // A real group of students, not a bucket to discard. The card labels it "Not
  // recorded" because an empty axis label reads as a bug.
  expect(result.courses).toEqual([
    {
      course: "",
      students: 3,
      rosterEntries: 0,
      attendedCheckIns: 0,
      attendanceRate: 0,
    },
  ]);
});

test("reports attendance as a percentage of the entries behind it", async () => {
  returns({ course: "BSIT", students: 5, roster_entries: 15, attended_check_ins: 9 });

  const [row] = (await getCourseParticipation()).courses;

  expect(row.attendanceRate).toBe(60);
});

test("rounds rather than truncating", async () => {
  // 1 of 3 is 33.3%. Truncating would say 33%, which reads as a different number.
  returns({ course: "BSINS", students: 1, roster_entries: 3, attended_check_ins: 1 });

  const [row] = (await getCourseParticipation()).courses;

  expect(row.attendanceRate).toBe(33);
});

test("reports no rate at all rather than dividing by nothing", async () => {
  returns({ course: "BSIT", students: 5, roster_entries: 0, attended_check_ins: 0 });

  const result = await getCourseParticipation();

  expect(result.courses[0].attendanceRate).toBe(0);
  expect(result.totals.attendanceRate).toBe(0);
});

test("the overall rate is across every check-in, not an average of rates", async () => {
  // A course with one roster entry must not carry the same weight as one with fifty.
  returns(
    { course: "Big", students: 10, roster_entries: 90, attended_check_ins: 90 },
    { course: "Small", students: 1, roster_entries: 1, attended_check_ins: 0 },
  );

  const result = await getCourseParticipation();

  expect(result.courses.map((row) => row.attendanceRate)).toEqual([100, 0]);
  // 90 of 91 is 98.9%. The mean of the two rates would be 50%.
  expect(result.totals.attendanceRate).toBe(99);
});

test("adds the per-course counts up to the totals", async () => {
  returns(
    { course: "BSCS", students: 5, roster_entries: 13, attended_check_ins: 4 },
    { course: "BSIT", students: 5, roster_entries: 15, attended_check_ins: 9 },
    { course: "BSINS", students: 3, roster_entries: 9, attended_check_ins: 5 },
  );

  const result = await getCourseParticipation();

  expect(result.totals).toEqual({
    courseCount: 3,
    students: 13,
    rosterEntries: 37,
    attendedCheckIns: 18,
    attendanceRate: 49,
  });
});

test("an empty directory is an empty result, not an error", async () => {
  returns();

  const result = await getCourseParticipation();

  expect(result.courses).toEqual([]);
  expect(result.totals.students).toBe(0);
  expect(result.totals.attendanceRate).toBe(0);
});

test("leaves removed students out", async () => {
  await getCourseParticipation();

  // The filter has to be in the query: pulling students out and discarding them
  // afterwards would count a removed student against a course they left. Both
  // queries need it, or the axis would disagree with the figures above it.
  expect(queryRaw).toHaveBeenCalledTimes(2);
  for (const [statement] of queryRaw.mock.calls as [{ strings: string[] }][]) {
    expect(statement.strings.join(" ")).toContain("deleted_at IS NULL");
  }
});

test("counts check-ins by the status the column actually stores", async () => {
  await getCourseParticipation();

  for (const [statement] of queryRaw.mock.calls as [{ strings: string[] }][]) {
    // The enum maps ATTENDED to 'attended'. Comparing against the TypeScript name
    // would silently match nothing and report every course as zero.
    expect(statement.strings.join(" ")).toContain("= 'attended'");
  }
});

test("reports one entry per event, oldest first", async () => {
  withEvents(
    { ...HACKATHON, course: "BSIT", roster_entries: 4, attended_check_ins: 3 },
    { ...ORIENTATION, course: "BSIT", roster_entries: 5, attended_check_ins: 2 }
  );

  const result = await getCourseParticipation();

  // The chart's axis runs in date order, so this has to be sorted here rather than
  // relying on the database's grouping order.
  expect(result.events.map((event) => event.id)).toEqual(["e-1", "e-2"]);
  expect(result.events[0]).toMatchObject({ name: "Orientation", onRoster: 5, attended: 2 });
});

test("breaks an event down by course", async () => {
  withEvents(
    { ...ORIENTATION, course: "BSIT", roster_entries: 6, attended_check_ins: 3 },
    { ...ORIENTATION, course: "BSCS", roster_entries: 4, attended_check_ins: 1 }
  );

  const [event] = (await getCourseParticipation()).events;

  expect(event.counts).toEqual({ BSIT: 3, BSCS: 1 });
  expect(event.onRoster).toBe(10);
  expect(event.attended).toBe(4);
});

test("keeps an event nobody turned up to, as a zero rather than nothing", async () => {
  withEvents({ ...ORIENTATION, course: "BSIT", roster_entries: 9, attended_check_ins: 0 });

  const [event] = (await getCourseParticipation()).events;

  // "The event happened and nobody came" is a finding. Reporting no bar at all
  // would be indistinguishable from the event not existing.
  expect(event.onRoster).toBe(9);
  expect(event.attended).toBe(0);
  expect(event.counts).toEqual({});
});

test("groups students whose course was never recorded on the axis too", async () => {
  withEvents({ ...ORIENTATION, course: "", roster_entries: 2, attended_check_ins: 2 });

  const [event] = (await getCourseParticipation()).events;

  // Keyed by the raw stored value, which is what the per-course query reports too,
  // so the two halves of the card agree on who is who.
  expect(event.counts).toEqual({ "": 2 });
});

test("the events and the per-course totals describe the same attendance", async () => {
  returns({ course: "BSIT", students: 5, roster_entries: 15, attended_check_ins: 9 });
  queryRaw.mockReset();
  queryRaw
    .mockResolvedValueOnce([{ course: "BSIT", students: 5, roster_entries: 15, attended_check_ins: 9 }])
    .mockResolvedValueOnce([
      { ...ORIENTATION, course: "BSIT", roster_entries: 8, attended_check_ins: 6 },
      { ...HACKATHON, course: "BSIT", roster_entries: 7, attended_check_ins: 3 },
    ]);

  const result = await getCourseParticipation();

  // Two queries that disagree would put a tab total and a set of bars that cannot
  // both be right, and nothing on the card would reveal it.
  expect(result.totalAttended).toBe(9);
  expect(result.totals.attendedCheckIns).toBe(9);
  expect(result.totalAttended).toBe(result.totals.attendedCheckIns);
});

test("an event with nobody on its roster is not on the axis", async () => {
  // It is the inner join that does this: an event nobody was ever added to says
  // nothing about participation, and would otherwise take up a slot on the axis.
  await getCourseParticipation();

  const [statement] = [queryRaw.mock.calls[1] as [{ strings: string[] }]][0];
  const sql = statement.strings.join(" ");

  expect(sql).toContain("JOIN public.events");
  expect(sql).not.toContain("LEFT JOIN public.events");
});