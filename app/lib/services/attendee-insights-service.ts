import "server-only";

import { Prisma } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

/**
 * Course participation, for the directory's insights card.
 *
 * `attendees.course` is free text and is stored exactly as written, so this groups on
 * the stored value rather than mapping it to a fixed set of three. That is the whole
 * point of the column: a registrar export containing "BS Information Technology" and
 * "BSIT" has to stay distinguishable, and folding everything unrecognised into one
 * bucket is the failure the KPI exists to detect (#109).
 *
 * The grouping happens in one query rather than by fetching students and counting in
 * JavaScript, because the roster entries being counted live on the other side of a
 * join and a registry of any size should not be pulled into memory to add up.
 */

export type CourseParticipation = {
  /**
   * The stored value, or an empty string for students whose course was never
   * recorded. Not null, because a chart axis cannot render one and because "nobody
   * wrote a course" is a group of students like any other.
   */
  course: string;
  students: number;
  /** Roster entries held by students in this course, present or not. */
  rosterEntries: number;
  attendedCheckIns: number;
  /** Whole percent. 0 when nobody here is on any roster, rather than undefined. */
  attendanceRate: number;
};

export type CourseParticipationResult = {
  courses: CourseParticipation[];
  totals: {
    /** How many distinct course values were found, including "not recorded". */
    courseCount: number;
    students: number;
    rosterEntries: number;
    attendedCheckIns: number;
    attendanceRate: number;
  };
};

type CourseRow = {
  course: string;
  students: number;
  roster_entries: number;
  attended_check_ins: number;
};

/**
 * The rate is computed here rather than in SQL because rounding in a query and
 * rounding in JavaScript disagree often enough to be noticed, and the card's tooltip
 * has to agree with the table it sits above.
 */
function toParticipation(row: CourseRow): CourseParticipation {
  return {
    course: row.course,
    students: row.students,
    rosterEntries: row.roster_entries,
    attendedCheckIns: row.attended_check_ins,
    attendanceRate:
      row.roster_entries === 0
        ? 0
        : Math.round((row.attended_check_ins / row.roster_entries) * 100),
  };
}

export async function getCourseParticipation(): Promise<CourseParticipationResult> {
  const rows = await getPrismaClient().$queryRaw<CourseRow[]>(Prisma.sql`
    SELECT
      COALESCE(attendee.course, '') AS course,
      COUNT(DISTINCT attendee.id)::int AS students,
      COUNT(roster_entry.id)::int AS roster_entries,
      COUNT(roster_entry.id) FILTER (WHERE roster_entry.status = 'attended')::int
        AS attended_check_ins
    FROM public.attendees AS attendee
    LEFT JOIN public.event_roster_entries AS roster_entry
      ON roster_entry.attendee_id = attendee.id
    WHERE attendee.deleted_at IS NULL
    GROUP BY COALESCE(attendee.course, '')
    ORDER BY COUNT(DISTINCT attendee.id) DESC, course ASC
  `);

  const courses = rows.map(toParticipation);

  const students = courses.reduce((total, row) => total + row.students, 0);
  const rosterEntries = courses.reduce((total, row) => total + row.rosterEntries, 0);
  const attendedCheckIns = courses.reduce((total, row) => total + row.attendedCheckIns, 0);

  return {
    courses,
    totals: {
      courseCount: courses.length,
      students,
      rosterEntries,
      attendedCheckIns,
      // Across every course rather than an average of rates: a course with one roster
      // entry must not count as much as a course with fifty.
      attendanceRate:
        rosterEntries === 0 ? 0 : Math.round((attendedCheckIns / rosterEntries) * 100),
    },
  };
}