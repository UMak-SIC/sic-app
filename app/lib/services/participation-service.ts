import "server-only";

import { RosterEntryStatus } from "@prisma/client";

import {
  canonicalCourseCode,
  compareCourses,
  UNRECORDED_COURSE,
} from "@/lib/courses";
import { getPrismaClient } from "@/lib/prisma";

/**
 * How many students of each course took part in each event.
 *
 * ## What counts as taking part
 *
 * A roster entry marked `ATTENDED`. Being on the list is not participation — an
 * event nobody arrived at has a roster and no participation, and counting the roster
 * would report a full house for an event that never happened.
 *
 * ## What is left out
 *
 * Students removed from the directory. Their attendance history is real and stays
 * attached to the events they attended, but they are no longer people the directory
 * reports on, so counting them here would put a number on screen that contradicts the
 * list above it.
 *
 * ## Which events appear
 *
 * Every event with at least one roster entry, oldest first. An event where nobody was
 * marked present appears with a bar of zero rather than disappearing, because "the
 * event happened and nobody came" is a finding. An event with no roster at all says
 * nothing about participation and is left out.
 */

export type ParticipationEvent = {
  id: string;
  name: string;
  startsAt: Date;
  /** Students of each course who were marked present, keyed by course. */
  counts: Record<string, number>;
  /** Everyone marked present, across all courses. */
  attended: number;
  /** Everyone on the roster, present or not. */
  onRoster: number;
};

export type CourseParticipation = {
  events: ParticipationEvent[];
  /**
   * Every course seen, in display order: the three known codes first in the order the
   * directory presents them, then anything else alphabetically, then the students
   * whose course was never recorded.
   */
  courses: string[];
  /** Students who took part across every event, per course. */
  totals: Record<string, number>;
  /** Everyone who took part, across every course. */
  totalAttended: number;
};

function courseKey(value: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNRECORDED_COURSE;
}

// Re-exported so the tests and the route can name the label without reaching past
// this module for it.
export { UNRECORDED_COURSE, canonicalCourseCode };

export async function getCourseParticipation(): Promise<CourseParticipation> {
  const rows = await getPrismaClient().eventRosterEntry.findMany({
    where: { attendee: { deletedAt: null } },
    select: {
      status: true,
      event: { select: { id: true, name: true, startsAt: true } },
      attendee: { select: { course: true } },
    },
    orderBy: { event: { startsAt: "asc" } },
  });

  const byEvent = new Map<string, ParticipationEvent>();
  const totals = new Map<string, number>();
  let totalAttended = 0;

  for (const row of rows) {
    let event = byEvent.get(row.event.id);

    if (!event) {
      event = {
        id: row.event.id,
        name: row.event.name,
        startsAt: row.event.startsAt,
        counts: {},
        attended: 0,
        onRoster: 0,
      };
      byEvent.set(row.event.id, event);
    }

    event.onRoster += 1;

    if (row.status !== RosterEntryStatus.ATTENDED) {
      continue;
    }

    const course = courseKey(row.attendee.course);

    event.counts[course] = (event.counts[course] ?? 0) + 1;
    event.attended += 1;
    totals.set(course, (totals.get(course) ?? 0) + 1);
    totalAttended += 1;
  }

  const events = [...byEvent.values()].sort(
    (left, right) => left.startsAt.getTime() - right.startsAt.getTime()
  );

  // Every course that appears anywhere, so a series with no attendance at one event
  // still has a zero there rather than a gap the axis would have to interpolate.
  const seen = new Set<string>();

  for (const event of events) {
    for (const course of Object.keys(event.counts)) {
      seen.add(course);
    }
  }

  const courses = [...seen].sort(compareCourses);

  const totalRecord: Record<string, number> = {};
  for (const course of courses) {
    totalRecord[course] = totals.get(course) ?? 0;
  }

  return { events, courses, totals: totalRecord, totalAttended };
}