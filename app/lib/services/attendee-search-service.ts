import "server-only";

import { Prisma } from "@prisma/client";

import {
  type AttendeeDirectoryItem,
  type AttendeeEventSummary,
  type ListAttendeesResult,
} from "@/lib/services/attendee-directory-service";
import { getPrismaClient } from "@/lib/prisma";

type SearchRow = {
  id: string;
  name: string;
  student_id: string;
  display_email: string;
  course: string | null;
  program: string | null;
  section: string | null;
  created_at: Date;
  events: AttendeeEventSummary[];
  total_count: bigint;
};

export async function searchGlobalAttendees({
  adminId,
  search,
  course,
  eventId,
  attendedOnly,
  page,
  pageSize,
}: {
  adminId: string;
  search?: string;
  /**
   * Exact free-text course, matched as stored. One of the values `facets.courses`
   * reports, which is how the toolbar's filter is populated.
   */
  course?: string;
  /** Only students on this event's roster. */
  eventId?: string;
  attendedOnly: boolean;
  page: number;
  pageSize: number;
}): Promise<ListAttendeesResult> {
  const rows = await getPrismaClient().$queryRaw<SearchRow[]>(Prisma.sql`
    SELECT *
    FROM public.search_global_attendees(
      ${adminId}, ${search ?? null}, ${attendedOnly}, ${course ?? null},
      ${eventId ?? null}::uuid, ${page}, ${pageSize}
    )
  `);

  const attendees: AttendeeDirectoryItem[] = rows.map((row) => {
    const attendedEventsCount = row.events.filter((event) => event.attended).length;
    const totalEventsJoined = row.events.length;

    return {
      id: row.id,
      name: row.name,
      studentId: row.student_id,
      email: row.display_email,
      course: row.course,
      program: row.program,
      section: row.section,
      joinedDate: row.created_at,
      events: row.events.map((event) => ({ ...event, startsAt: new Date(event.startsAt) })),
      totalEventsJoined,
      attendedEventsCount,
      attendanceRate: totalEventsJoined === 0 ? 0 : Math.round((attendedEventsCount / totalEventsJoined) * 100),
    };
  });
  const total = rows.length === 0 ? 0 : Number(rows[0].total_count);

  /*
   * The courses present, for the toolbar's filter.
   *
   * A second query rather than something derived from `rows`: this is how the
   * operator picks a filter, so it must not be narrowed by the filter already in
   * force, or the other values become unreachable. And it cannot come out of the
   * search function, which returns one page of students.
   */
  const courseFacets = await getPrismaClient().attendee.findMany({
    where: { deletedAt: null, course: { not: null } },
    distinct: ["course"],
    orderBy: { course: "asc" },
    select: { course: true },
  });

  return {
    attendees,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    facets: {
      courses: courseFacets
        .map((row) => row.course)
        .filter((value): value is string => typeof value === "string" && value.trim() !== ""),
    },
  };
}
