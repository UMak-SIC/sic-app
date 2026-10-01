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
  attendedOnly,
  page,
  pageSize,
}: {
  adminId: string;
  search?: string;
  attendedOnly: boolean;
  page: number;
  pageSize: number;
}): Promise<ListAttendeesResult> {
  const rows = await getPrismaClient().$queryRaw<SearchRow[]>(Prisma.sql`
    SELECT *
    FROM public.search_global_attendees(
      ${adminId}::text,
      ${search ?? null}::text,
      ${attendedOnly}::boolean,
      ${null}::text,
      ${null}::uuid,
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
      totalEventsJoined,
      attendedEventsCount,
      attendanceRate: totalEventsJoined === 0 ? 0 : Math.round((attendedEventsCount / totalEventsJoined) * 100),
    };
  });
  const total = rows.length === 0 ? 0 : Number(rows[0].total_count);

  return {
    attendees,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
