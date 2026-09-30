import type { AttendeeItem } from "./attendees-table";

/**
 * Reads the attendee registry for the directory view.
 *
 * The API is the source of truth for what an attendee is. This module exists only
 * to translate its response into the shape the table renders, and to turn a failed
 * request into a sentence a person can act on.
 *
 * ## Filters the toolbar shows but this cannot send
 *
 * The toolbar offers a course filter and an event filter. **The API has no
 * parameter for either.** They are deliberately not plumbed through here: applying
 * them in the browser would filter one page of results and silently miss every
 * match on the pages it never fetched, which is worse than not offering them. They
 * need query parameters on `GET /api/attendees` before they can work.
 */

/** Rows per page. The options are what the toolbar's page-size control offers. */
export const PAGE_SIZE_OPTIONS = [8, 16, 32, 64] as const;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 8;

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
  timezone: string;
};

export type DirectoryResult = {
  attendees: AttendeeItem[];
  pagination: DirectoryResponse["pagination"];
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
  page,
  pageSize,
  signal,
}: {
  query: string;
  page: number;
  pageSize: PageSize;
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
  };
}
