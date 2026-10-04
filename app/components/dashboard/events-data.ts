import { DonutDatum } from "./donut-chart";

export interface DashboardEvent {
  id: string;
  startsAt: string;
  dateKey: string;
  day: number;
  dateFormatted: string;
  monthYear: string;
  title: string;
  location: string;
  participants: number;
  collegeBreakdown: DonutDatum[];
}

export type PersistedEvent = {
  id: string;
  name: string;
  venue: string | null;
  startsAt: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  _count: { rosterEntries: number };
};

type RegistrationBreakdown = { course: string; students: number };

const BREAKDOWN_COLORS = ["var(--cyan)", "var(--green)", "var(--amber)", "var(--muted)"];

export function toDashboardEvent(event: PersistedEvent, timezone: string): DashboardEvent {
  const startsAt = new Date(event.startsAt);
  const date = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: timezone,
  }).format(startsAt);
  const monthYear = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(startsAt);
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timezone,
  }).formatToParts(startsAt);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value ?? "";
  const dateKey = `${part("year")}-${part("month")}-${part("day")}`;

  return {
    id: event.id,
    startsAt: event.startsAt,
    dateKey,
    day: Number(part("day")),
    dateFormatted: date,
    monthYear,
    title: event.name,
    location: event.venue ?? "Online event",
    participants: event._count.rosterEntries,
    collegeBreakdown: [],
  };
}

export function toRegistrationBreakdown(rows: RegistrationBreakdown[]): DonutDatum[] {
  return rows.map((row, index) => ({
    name: row.course || "Not recorded",
    value: row.students,
    color: BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length],
    amount: `${row.students} students`,
  }));
}
