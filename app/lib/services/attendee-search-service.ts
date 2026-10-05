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
  // Optional while instances roll out the database function migration that adds it.
  organized_events?: { id: string; name: string; startsAt: string }[];
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
  /*
   * Every argument is cast, because the function is overloaded on its parameter list
   * and Postgres will not guess which one is meant without them.
   *
   * The course and event filters are passed rather than left null. They were null
   * when the signature was realigned because nothing called for them yet; the
   * directory's toolbar does now, and leaving them null would silently ignore the
   * filter the operator just picked.
   */
  const rows = await getPrismaClient().$queryRaw<SearchRow[]>(Prisma.sql`
    SELECT *
    FROM public.search_global_attendees(
      ${adminId}::text,
      ${search ?? null}::text,
      ${attendedOnly}::boolean,
      ${course ?? null}::text,
      ${eventId ?? null}::uuid,
      ${page}::integer,
      ${pageSize}::integer
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
      organizedEvents: (row.organized_events ?? []).map((event) => ({
        ...event,
        startsAt: new Date(event.startsAt),
      })),
      totalEventsJoined,
      attendedEventsCount,
      attendanceRate: totalEventsJoined === 0 ? 0 : Math.round((attendedEventsCount / totalEventsJoined) * 100),
    };
  });
  const total = rows.length === 0 ? 0 : Number(rows[0].total_count);

  /*
   * The values present, for the toolbar's filter and the attendee form.
   *
   * A second query rather than something derived from `rows`: this is how the
   * operator picks a filter, so it must not be narrowed by the filter already in
   * force, or the other values become unreachable. And it cannot come out of the
   * search function, which returns one page of students.
   */
  const [courseFacets, programFacets, sectionFacets] = await Promise.all([
    getPrismaClient().attendee.findMany({
      where: { deletedAt: null, course: { not: null } },
      distinct: ["course"],
      orderBy: { course: "asc" },
      select: { course: true },
    }),
    getPrismaClient().attendee.findMany({
      where: { deletedAt: null, program: { not: null } },
      distinct: ["program"],
      orderBy: { program: "asc" },
      select: { program: true },
    }),
    getPrismaClient().attendee.findMany({
      where: { deletedAt: null, section: { not: null } },
      distinct: ["section"],
      orderBy: { section: "asc" },
      select: { section: true },
    }),
  ]);

  const recordedValues = <T extends "course" | "program" | "section">(
    rows: { [K in T]: string | null }[],
    field: T,
  ) =>
    rows
      .map((row) => row[field])
      .filter((value): value is string => typeof value === "string" && value.trim() !== "");

  return {
    attendees,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    facets: {
      courses: recordedValues(courseFacets, "course"),
      programs: recordedValues(programFacets, "program"),
      sections: recordedValues(sectionFacets, "section"),
    },
  };
}
