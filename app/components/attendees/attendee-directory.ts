import type { AttendeeItem } from "./attendees-table";
import type { AvailableEvent } from "./add-to-event-dialog";

/**
 * Reads the attendee registry for the directory view.
 *
 * The API is the source of truth for what an attendee is. This module exists only
 * to translate its response into the shape the table renders, and to turn a failed
 * request into a sentence a person can act on.
 *
 * ## Filters
 *
 * `course` and `eventId` are sent to the API rather than applied here. Filtering one
 * page of results in the browser would miss every match on the pages it never
 * fetched, which is worse than not offering the filter at all — that is why these two
 * were disabled until `GET /api/attendees` grew parameters for them.
 */

/** Rows per page. The options are what the toolbar's page-size control offers. */
export const PAGE_SIZE_OPTIONS = [8, 16, 32, 64] as const;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 8;

/**
 * The largest page the API will serve. The export walks the registry in steps of
 * this, so it is not a value the page-size control offers.
 */
export const MAX_PAGE_SIZE = 100;

type AttendeeDto = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  course: string | null;
  program: string | null;
  section: string | null;
  joinedDate: string;
  events: { id: string; name: string; startsAt: string; attended: boolean }[];
  totalEventsJoined: number;
  attendedEventsCount: number;
  attendanceRate: number;
};

type DirectoryResponse = {
  attendees: AttendeeDto[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  /** Distinct courses present, so the filter lists real values. */
  facets?: { courses?: string[] };
  timezone: string;
};

export type DirectoryResult = {
  attendees: AttendeeItem[];
  pagination: DirectoryResponse["pagination"];
  courses: string[];
};

/** The filters the directory and the export both apply. */
export type DirectoryFilters = {
  query: string;
  course?: string;
  eventId?: string;
};

function formatDate(iso: string, timeZone: string, style: "long" | "short"): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    ...(style === "long" ? { year: "numeric" } : {}),
    timeZone,
  }).format(new Date(iso));
}

/**
 * Formats a date in the organization's timezone rather than the browser's.
 *
 * The API returns the timezone alongside the payload for exactly this. Using the
 * viewer's own zone would show an event on the wrong day for anyone outside the
 * campus's.
 */
function toAttendeeItem(row: AttendeeDto, timeZone: string): AttendeeItem {
  return {
    id: row.id,
    name: row.name,
    studentId: row.studentId,
    email: row.email,
    course: row.course,
    program: row.program,
    section: row.section,
    assignedEvents: row.events.map((event) => ({
      id: event.id,
      title: event.name,
      date: formatDate(event.startsAt, timeZone, "short"),
      attended: event.attended,
    })),
    // The API derives these from roster entries, so the directory keeps no copy of
    // the arithmetic.
    totalEventsJoined: row.totalEventsJoined,
    attendedEventsCount: row.attendedEventsCount,
    attendanceRate: row.attendanceRate,
    joinedDate: formatDate(row.joinedDate, timeZone, "long"),
  };
}

export async function fetchAttendeeDirectory({
  query,
  course,
  eventId,
  page,
  pageSize,
  signal,
}: {
  query: string;
  /** Exact free-text course, as listed by `facets.courses`. */
  course?: string;
  /** Only students on this event's roster. */
  eventId?: string;
  page: number;
  /**
   * Any size the API accepts, not just the ones the page-size control offers. The
   * export walks the whole registry with the API's maximum, which is deliberately
   * not a user-selectable option.
   */
  pageSize: number;
  signal?: AbortSignal;
}): Promise<DirectoryResult> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const term = query.trim();

  if (term) {
    params.set("q", term);
  }

  if (course) {
    params.set("course", course);
  }

  if (eventId) {
    params.set("eventId", eventId);
  }

  const response = await fetch(`/api/attendees?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (response.status === 401) {
    throw new Error("Your session has ended. Sign in again to see the directory.");
  }

  if (!response.ok) {
    // The API answers in plain language already; this is the fallback for when it
    // does not, and for a body that is not JSON at all.
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "The directory could not be loaded. Try again.");
  }

  const payload = (await response.json()) as DirectoryResponse;

  return {
    attendees: payload.attendees.map((row) => toAttendeeItem(row, payload.timezone)),
    pagination: payload.pagination,
    courses: payload.facets?.courses ?? [],
  };
}

/**
 * Every student matching the current filters, across all pages.
 *
 * The export used to build its file from the rows on screen, which meant a CSV of
 * whichever page happened to be showing. Somebody filtering to one course and
 * exporting would get eight students and no way to tell that was not all of them.
 *
 * Walks the API's largest page size until the reported total is reached. The total
 * comes from the first response and is re-checked each pass, so a registry that grew
 * mid-export is not silently truncated.
 */
export async function fetchAllAttendees(
  filters: DirectoryFilters,
  signal?: AbortSignal
): Promise<{ attendees: AttendeeItem[]; total: number }> {
  const collected: AttendeeItem[] = [];
  let page = 1;
  let total = 0;
  let totalPages = 1;

  do {
    const result = await fetchAttendeeDirectory({
      ...filters,
      page,
      pageSize: MAX_PAGE_SIZE,
      signal,
    });

    collected.push(...result.attendees);
    total = result.pagination.total;
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);

  return { attendees: collected, total };
}

/**
 * Quotes a value for CSV, and doubles any quote inside it.
 *
 * Without this a name containing a comma becomes two columns in the spreadsheet, and
 * one containing a quote ends the field early. Neither is visible until somebody
 * opens the file and finds the data misaligned.
 */
function csvCell(value: string | number): string {
  const text = String(value);

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const EXPORT_HEADERS = [
  "Name",
  "Student ID",
  "Email",
  "Course Track",
  "Degree Program",
  "Section",
  "Registered Events Count",
  "Attendance Rate (%)",
  "Joined Date",
];

/**
 * Writes the directory to a CSV file.
 *
 * A Blob rather than a data URI: a data URI for a few thousand rows is a very long
 * string, and browsers refuse navigation to those. The object URL is revoked
 * immediately after the click, because a leaked one pins the whole export in memory.
 */
export function downloadAttendeeCsv(attendees: AttendeeItem[], scopeLabel: string): void {
  const lines = [
    EXPORT_HEADERS.join(","),
    ...attendees.map((student) =>
      [
        csvCell(student.name),
        csvCell(student.studentId),
        csvCell(student.email),
        csvCell(student.course ?? ""),
        csvCell(student.program ?? ""),
        csvCell(student.section ?? ""),
        csvCell(student.totalEventsJoined),
        csvCell(`${student.attendanceRate.toFixed(1)}%`),
        csvCell(student.joinedDate),
      ].join(","),
    ),
  ];

  // A BOM, so a spreadsheet opens the file as UTF-8 rather than guessing a codepage.
  // Without it a name with a diacritic arrives mangled.
  const blob = new Blob([`﻿${lines.join("\r\n")}`], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `student_directory_${scopeLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * A short description of what the export covers, for the file name.
 *
 * The file has to say which slice it is, or a folder of these is unreadable. An event
 * is named by id here, which is stable and needs no lookup; the date in the name
 * carries the rest.
 */
export function describeExportScope(
  filters: DirectoryFilters,
  selectedCount: number
): string {
  if (selectedCount > 0) return `selected-${selectedCount}`;

  const parts: string[] = [];

  if (filters.query.trim()) parts.push(slug(filters.query.trim()));
  if (filters.course) parts.push(slug(filters.course));
  if (filters.eventId) parts.push("one-event");

  return parts.length > 0 ? parts.join("-") : "all";
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export type CourseInsights = {
  courses: {
    /** The stored value, or "" for students whose course was never recorded. */
    course: string;
    students: number;
    rosterEntries: number;
    attendedCheckIns: number;
    attendanceRate: number;
  }[];
  totals: {
    courseCount: number;
    students: number;
    rosterEntries: number;
    attendedCheckIns: number;
    attendanceRate: number;
  };
  /**
   * The chart's horizontal axis: one entry per event, oldest first. Only events with
   * somebody on their roster are here.
   */
  events: {
    id: string;
    name: string;
    startsAt: string;
    /** Students of each course marked present, keyed by stored course value. */
    counts: Record<string, number>;
    onRoster: number;
    attended: number;
  }[];
  /** Everyone marked present, across every event and course. */
  totalAttended: number;
  timezone: string;
};

/**
 * Course participation, for the insights card.
 *
 * A separate request from the directory because it is an aggregate over the whole
 * registry. Computing it from the page on screen would describe one page of results
 * while sitting directly above a table of them.
 */
export async function fetchCourseInsights(signal?: AbortSignal): Promise<CourseInsights> {
  const response = await fetch("/api/attendees/insights", {
    signal,
    headers: { Accept: "application/json" },
  });

  if (response.status === 401) {
    throw new Error("Your session has ended. Sign in again to see these figures.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "These figures could not be loaded. Try again.");
  }

  return (await response.json()) as CourseInsights;
}

/**
 * Every event, for the "add to event" picker and the event filter.
 *
 * `includeClosed` exists because the two callers want different things. Adding
 * somebody to an event that has already happened cannot change its attendance, so
 * the picker leaves closed events out. Filtering by an event is the opposite: the
 * event somebody wants to look up is usually one that has already finished, since
 * that is the roster they are checking.
 */
export async function fetchAvailableEvents(
  options: { signal?: AbortSignal; includeClosed?: boolean } = {}
): Promise<{
  events: (AvailableEvent & { closed: boolean })[];
  openEvents: AvailableEvent[];
  timezone: string;
}> {
  const { signal, includeClosed = false } = options;

  const response = await fetch("/api/events", { signal, headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error("The list of events could not be loaded. Try again.");
  }

  const payload = (await response.json()) as {
    events: {
      id: string;
      name: string;
      startsAt: string;
      status: "DRAFT" | "PUBLISHED" | "CLOSED";
    }[];
    timezone: string;
  };

  const events = payload.events.map((event) => ({
    id: event.id,
    title: event.name,
    date: formatDate(event.startsAt, payload.timezone, "long"),
    status: event.status === "PUBLISHED" ? ("published" as const) : ("draft" as const),
    closed: event.status === "CLOSED",
  }));

  return {
    events: includeClosed ? events : events.filter((event) => !event.closed),
    openEvents: events.filter((event) => !event.closed),
    timezone: payload.timezone,
  };
}

// There used to be a whole-registry fetch here, for the import dialog's duplicate
// check. It is gone because the import preview runs on the server against the full
// table, so the browser no longer has to hold every attendee to spot a duplicate.
