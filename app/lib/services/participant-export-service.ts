import "server-only";

import { getPrismaClient } from "@/lib/prisma";
import { getOrganizationTimezone } from "@/lib/events/organization-timezone";
import { toCsv } from "@/lib/csv";

const personSelect = {
  id: true, name: true, displayEmail: true, studentId: true,
  course: true, program: true, section: true, createdAt: true, deletedAt: true,
} as const;
const eventSelect = {
  id: true, name: true, details: true, venue: true, status: true,
  startsAt: true, endsAt: true, closedAt: true, createdAt: true,
} as const;
const attendanceSelect = {
  status: true, arrivedAt: true, createdAt: true,
  deliveries: {
    where: { status: "SENT" as const },
    orderBy: { sentAt: "desc" as const },
    take: 1,
    select: { sentAt: true },
  },
} as const;

const personHeaders = ["Participant ID", "Name", "Email", "Student ID", "Course Track", "Degree Program", "Section", "Joined Date (UTC)", "Removed from Directory (UTC)"];
const eventHeaders = ["Event ID", "Event", "Event Details", "Venue", "Event Status", "Event Start (UTC)", "Event End (UTC)", "Organization Timezone", "Event Closed (UTC)", "Event Created (UTC)"];
const attendanceHeaders = ["Attendance", "Check-in Time (UTC)", "Added to Event (UTC)", "Ticket Status", "Ticket Sent (UTC)"];

type Person = { id: string; name: string; displayEmail: string; studentId: string; course: string | null; program: string | null; section: string | null; createdAt: Date; deletedAt: Date | null };
type ExportEvent = { id: string; name: string; details: string; venue: string | null; status: string; startsAt: Date; endsAt: Date; closedAt: Date | null; createdAt: Date };
type Attendance = { status: string; arrivedAt: Date | null; createdAt: Date; deliveries: { sentAt: Date | null }[] };
const iso = (date: Date | null) => date?.toISOString() ?? "";
const personValues = (person: Person) => [person.id, person.name, person.displayEmail, person.studentId, person.course, person.program, person.section, iso(person.createdAt), iso(person.deletedAt)];
const eventValues = (event: ExportEvent, timezone: string) => [event.id, event.name, event.details, event.venue, label(event.status), iso(event.startsAt), iso(event.endsAt), timezone, iso(event.closedAt), iso(event.createdAt)];
function label(status: string) {
  return status === "PENDING" ? "Not recorded" : status.charAt(0) + status.slice(1).toLowerCase();
}
const attendanceValues = (entry: Attendance) => [label(entry.status), iso(entry.arrivedAt), iso(entry.createdAt), entry.deliveries.length ? "Sent" : "Not sent", iso(entry.deliveries[0]?.sentAt ?? null)];

const participantHeaders = personHeaders.slice(0, 7);
const participantAttendanceHeaders = ["Attendance", "Check-in Time (UTC)", "Check-in Time (GMT+8)"];
const participantValues = (person: Pick<Person, "id" | "name" | "displayEmail" | "studentId" | "course" | "program" | "section">) => [person.id, person.name, person.displayEmail, person.studentId, person.course, person.program, person.section];
const participantAttendanceValues = (entry: Pick<Attendance, "status" | "arrivedAt">) => [
  label(entry.status), iso(entry.arrivedAt),
  entry.arrivedAt ? `${new Date(entry.arrivedAt.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19)}+08:00` : "",
];

async function getExportEvents(ids: string[]) {
  return getPrismaClient().event.findMany({
    where: { id: { in: ids } },
    orderBy: [{ startsAt: "desc" }, { id: "asc" }],
    select: {
      ...eventSelect,
      rosterEntries: {
        orderBy: [{ attendee: { name: "asc" } }, { id: "asc" }],
        select: { ...attendanceSelect, attendee: { select: personSelect } },
      },
    },
  });
}

/** One row per event participant; retain an event row when nobody is invited yet. */
export async function exportEvents(ids: string[]) {
  const events = await getExportEvents(ids);
  const timezone = getOrganizationTimezone();
  const rows = events.flatMap((event) => {
    const entries = event.rosterEntries;
    const eventRow = [...eventValues(event, timezone), entries.length,
      entries.filter((entry) => entry.status === "ATTENDED").length,
      entries.filter((entry) => entry.status === "ABSENT").length,
      entries.filter((entry) => entry.status === "PENDING").length];
    return entries.length
      ? entries.map((entry) => [...eventRow, ...personValues(entry.attendee), ...attendanceValues(entry)])
      : [[...eventRow, ...Array<string>(personHeaders.length + attendanceHeaders.length).fill("")]];
  });
  return {
    events,
    csv: toCsv([...eventHeaders, "Participants", "Attended", "Absent", "Not Recorded", ...personHeaders, ...attendanceHeaders], rows),
  };
}

/** Participant downloads inside event details use the compact attendee columns. */
export async function exportEventParticipants(id: string) {
  const events = await getExportEvents([id]);
  const rows = events.flatMap((event) => event.rosterEntries.map((entry) => [
    ...participantValues(entry.attendee), ...participantAttendanceValues(entry),
  ]));
  return { events, csv: toCsv([...participantHeaders, ...participantAttendanceHeaders], rows) };
}

/** Directory export preserves every selected student's complete event history. */
export async function exportParticipants(ids: string[]) {
  const people = await getPrismaClient().attendee.findMany({
    where: { id: { in: ids }, deletedAt: null },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true, name: true, displayEmail: true, studentId: true,
      course: true, program: true, section: true,
      rosterEntries: {
        orderBy: [{ event: { startsAt: "desc" } }, { id: "asc" }],
        select: { status: true, arrivedAt: true },
      },
    },
  });
  const rows = people.flatMap((person) => {
    const count = person.rosterEntries.length;
    const attended = person.rosterEntries.filter((entry) => entry.status === "ATTENDED").length;
    const personRow = [...participantValues(person), count, attended, count ? Math.round(attended / count * 100) : 0];
    return count
      ? person.rosterEntries.map((entry) => [...personRow, ...participantAttendanceValues(entry)])
      : [[...personRow, ...Array<string>(participantAttendanceHeaders.length).fill("")]];
  });
  return toCsv([...participantHeaders, "Registered Events Count", "Attended Events Count", "Attendance Rate (%)", ...participantAttendanceHeaders], rows);
}
