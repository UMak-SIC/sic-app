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
  /**
   * One entry per event, oldest first. This is what the chart's horizontal axis is:
   * participation happens at events, so a bar per day would report activity on days
   * when nothing happened.
   *
   * Only events with somebody on the roster appear. An event where nobody was marked
   * present is here with a bar of zero rather than missing, because "the event
   * happened and nobody came" is a finding; an event with an empty roster says
   * nothing about participation at all.
   */
  events: EventParticipation[];
  /** Everyone marked present, across every event and every course. */
  totalAttended: number;
};

export type EventParticipation = {
  id: string;
  name: string;
  startsAt: Date;
  /**
   * Students of each course who were marked present, keyed by the stored course
   * value. An empty key is a student whose course was never recorded, which is a real
   * group of students rather than a gap in the data.
   */
  counts: Record<string, number>;
  /** Everyone on the roster, present or not. */
  onRoster: number;
  /** Everyone marked present, across all courses. */
  attended: number;
};

type CourseRow = {
  course: string;
  students: number;
  roster_entries: number;
  attended_check_ins: number;
};

type EventRow = {
  event_id: string;
  event_name: string;
  event_starts_at: Date;
  course: string;
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
  const [rows, eventRows] = await getPrismaClient().$transaction([
    getPrismaClient().$queryRaw<CourseRow[]>(Prisma.sql`
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
    `),

    /*
     * The chart's axis. Joined from the roster entries rather than from attendees so
     * an event only appears once somebody is on its list, which is also why an event
     * nobody was ever added to is absent.
     */
    getPrismaClient().$queryRaw<EventRow[]>(Prisma.sql`
      SELECT
        event.id AS event_id,
        event.name AS event_name,
        event.starts_at AS event_starts_at,
        COALESCE(attendee.course, '') AS course,
        COUNT(roster_entry.id)::int AS roster_entries,
        COUNT(roster_entry.id) FILTER (WHERE roster_entry.status = 'attended')::int
          AS attended_check_ins
      FROM public.event_roster_entries AS roster_entry
      JOIN public.attendees AS attendee ON attendee.id = roster_entry.attendee_id
      JOIN public.events AS event ON event.id = roster_entry.event_id
      WHERE attendee.deleted_at IS NULL
      GROUP BY event.id, event.name, event.starts_at, COALESCE(attendee.course, '')
      ORDER BY event.starts_at ASC, course ASC
    `),
  ]);

  const courses = rows.map(toParticipation);

  const students = courses.reduce((total, row) => total + row.students, 0);
  const rosterEntries = courses.reduce((total, row) => total + row.rosterEntries, 0);
  const attendedCheckIns = courses.reduce((total, row) => total + row.attendedCheckIns, 0);

  /*
   * Folded in JavaScript rather than pivoted in SQL: the rows arrive grouped by
   * event and course already, and a map per event is both easier to read and easier
   * to keep correct than a second query that pivots on columns named after whatever
   * courses the registry happens to hold.
   */
  const events: EventParticipation[] = [];

  for (const row of eventRows) {
    let event = events.find((entry) => entry.id === row.event_id);

    if (!event) {
      event = {
        id: row.event_id,
        name: row.event_name,
        startsAt: row.event_starts_at,
        counts: {},
        onRoster: 0,
        attended: 0,
      };
      events.push(event);
    }

    event.onRoster += row.roster_entries;

    if (row.attended_check_ins > 0) {
      event.counts[row.course] = (event.counts[row.course] ?? 0) + row.attended_check_ins;
      event.attended += row.attended_check_ins;
    }
  }

  // Sorted here rather than left to the query's ORDER BY: the rows are being folded
  // in JavaScript, and the axis has to be in date order whatever order they arrived.
  events.sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

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
    events,
    totalAttended: events.reduce((total, event) => total + event.attended, 0),
  };
}