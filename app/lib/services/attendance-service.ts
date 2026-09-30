import "server-only";

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
