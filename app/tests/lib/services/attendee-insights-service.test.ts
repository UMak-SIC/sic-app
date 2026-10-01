import { afterEach, beforeEach, expect, test, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => ({ $queryRaw: queryRaw }) }));

import { getCourseParticipation } from "@/lib/services/attendee-insights-service";

/**
 * Course participation, the aggregate behind the directory's insights card.
 *
 * `course` is free text, so these tests are mostly about not pretending it is a set of
 * three: a value nobody recognises has to survive to the caller as itself.
 */

function returns(...rows: {
  course: string;
  students: number;
  roster_entries: number;
  attended_check_ins: number;
}[]) {
  queryRaw.mockResolvedValue(rows);
}

beforeEach(() => {
  vi.clearAllMocks();
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
  // afterwards would count a removed student against a course they left.
  expect(queryRaw).toHaveBeenCalledOnce();
  const [statement] = queryRaw.mock.calls[0] as [{ strings: string[] }];
  const sql = statement.strings.join(" ");
  expect(sql).toContain("deleted_at IS NULL");
});

test("counts check-ins by the status the column actually stores", async () => {
  await getCourseParticipation();

  const [statement] = queryRaw.mock.calls[0] as [{ strings: string[] }];

  // The enum maps ATTENDED to 'attended'. Comparing against the TypeScript name
  // would silently match nothing and report every course as zero.
  expect(statement.strings.join(" ")).toContain("= 'attended'");
});