import "server-only";

import { RosterEntryStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

/**
 * Read side of the attendee registry.
 *
 * The write side lives in `attendee-service.ts` (import preview/commit). This is
 * the list the directory view and the past-attendee recipient selector both need,
 * and it is deliberately separate: nothing here writes, and nothing in the import
 * path reads it.
 *
 * ## What this deliberately does not return
 *
 * The directory UI's `AttendeeItem` shape also carries a per-event `shortCode`.
 * **No schema column holds it** — `Event` has no `short_code`, and the decision
 * recorded in #109 is to drop it from the UI rather than add a column, since the
 * event already has a unique id. It is therefore omitted rather than invented or
 * returned empty.
 *
 * `course` and `program` *were* in the same position, and were resolved the other
 * way: #109 decided to add them to `Attendee` so the course-reach KPI can group
 * on them. They are now real columns.
 */

export type AttendeeEventSummary = {
  id: string;
  name: string;
  startsAt: Date;
  attended: boolean;
};

export type AttendeeDirectoryItem = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  /** Free text, null when never recorded. Grouped on for the course KPI. */
  course: string | null;
  program: string | null;
  /** The student's year and block, e.g. "BSIT-2A". */
  section: string | null;
  joinedDate: Date;
  events: AttendeeEventSummary[];
  totalEventsJoined: number;
  attendedEventsCount: number;
  /** Whole percent, 0 when the attendee is on no roster. */
  attendanceRate: number;
};

export type ListAttendeesResult = {
  attendees: AttendeeDirectoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/**
 * Matches the search behaviour `getEventAttendance` already uses, so the same
 * query finds the same people in either place.
 */
function searchFilter(term: string) {
  return {
    OR: [
      { name: { contains: term, mode: "insensitive" as const } },
      { displayEmail: { contains: term, mode: "insensitive" as const } },
      { studentId: { contains: term, mode: "insensitive" as const } },
    ],
  };
}

export async function listAttendees({
  search,
  attendedOnly = false,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  search?: string;
  /**
   * Only people who were marked present at least once — the past-attendee filter
   * the recipient selector needs (US-08).
   *
   * No date filter is applied, because "previous" is a product decision and the
   * schema does not imply one. In practice `ATTENDED` already means past: nobody
   * is marked present at an event that has not happened.
   */
  attendedOnly?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<ListAttendeesResult> {
  const term = search?.trim();

  const where = {
    // A removed student is not in the directory. The roster entries below are left
    // unfiltered on purpose: they are the history of what the student attended, and
    // it stays true after they are removed.
    deletedAt: null,
    ...(term ? searchFilter(term) : {}),
    ...(attendedOnly
      ? { rosterEntries: { some: { status: RosterEntryStatus.ATTENDED } } }
      : {}),
  };

  const [rows, total] = await getPrismaClient().$transaction([
    getPrismaClient().attendee.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        studentId: true,
        displayEmail: true,
        course: true,
        program: true,
        section: true,
        createdAt: true,
        rosterEntries: {
          orderBy: { event: { startsAt: "desc" } },
          select: {
            status: true,
            event: { select: { id: true, name: true, startsAt: true } },
          },
        },
      },
    }),
    getPrismaClient().attendee.count({ where }),
  ]);

  return {
    attendees: rows.map((row) => {
      const attendedEventsCount = row.rosterEntries.filter(
        (entry) => entry.status === RosterEntryStatus.ATTENDED,
      ).length;

      return {
        id: row.id,
        name: row.name,
        studentId: row.studentId,
        // displayEmail, not normalizedEmail: DMA-02 keeps the normalised form for
        // matching and the display form for what a human sees.
        email: row.displayEmail,
        course: row.course,
        program: row.program,
        section: row.section,
        joinedDate: row.createdAt,
        events: row.rosterEntries.map((entry) => ({
          id: entry.event.id,
          name: entry.event.name,
          startsAt: entry.event.startsAt,
          attended: entry.status === RosterEntryStatus.ATTENDED,
        })),
        totalEventsJoined: row.rosterEntries.length,
        attendedEventsCount,
        // An attendee on no roster has a rate of 0, not a division by zero.
        attendanceRate:
          row.rosterEntries.length === 0
            ? 0
            : Math.round((attendedEventsCount / row.rosterEntries.length) * 100),
      };
    }),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
