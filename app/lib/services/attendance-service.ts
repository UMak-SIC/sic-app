import "server-only";

import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/prisma";

export type AttendanceEntry = {
  name: string;
  email: string;
  studentId: string;
  status: "pending" | "attended" | "absent";
  arrivedAt: Date | null;
};

export async function getEventAttendance(eventId: string, search?: string) {
  const term = search?.trim();

  const event = await getPrismaClient().event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      startsAt: true,
      endsAt: true,
      _count: { select: { rosterEntries: true } },
      rosterEntries: {
        where: term
          ? {
              attendee: {
                OR: [
                  { name: { contains: term, mode: "insensitive" } },
                  { displayEmail: { contains: term, mode: "insensitive" } },
                  { studentId: { contains: term, mode: "insensitive" } },
                ],
              },
            }
          : undefined,
        orderBy: [{ status: "asc" }, { arrivedAt: "desc" }],
        select: {
          status: true,
          arrivedAt: true,
          attendee: { select: { name: true, displayEmail: true, studentId: true } },
        },
      },
    },
  });

  if (!event) return null;

  const attendedCount = await getPrismaClient().eventRosterEntry.count({
    where: { eventId, status: "ATTENDED" },
  });

  return {
    ...event,
    attendedCount,
    totalRosterEntries: event._count.rosterEntries,
  };
}

export async function getEventRegistrationBreakdown(eventId: string) {
  const event = await getPrismaClient().event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) return null;

  return getPrismaClient().$queryRaw<{ course: string; students: number }[]>(Prisma.sql`
    SELECT COALESCE(attendee.course, '') AS course, COUNT(*)::int AS students
    FROM public.event_roster_entries AS roster_entry
    JOIN public.attendees AS attendee ON attendee.id = roster_entry.attendee_id
    WHERE roster_entry.event_id = ${eventId}::uuid
    GROUP BY COALESCE(attendee.course, '')
    ORDER BY students DESC, course ASC
  `);
}

export function toAttendanceCsv(entries: AttendanceEntry[]): string {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const timestamp = (value: Date | null) => (value ? value.toISOString() : "");

  return [
    "name,email,student_id,status,checked_in_at",
    ...entries.map((entry) =>
      [entry.name, entry.email, entry.studentId, entry.status, timestamp(entry.arrivedAt)]
        .map(escape)
        .join(","),
    ),
  ].join("\r\n");
}
