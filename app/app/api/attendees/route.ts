import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrganizationTimezone } from "@/lib/events/organization-timezone";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/services/attendee-directory-service";
import { searchGlobalAttendees } from "@/lib/services/attendee-search-service";
import { AttendeeWriteError, createAttendee } from "@/lib/services/attendee-service";
import { readAttendeeDetails } from "@/lib/validation/attendee-validation";

/**
 * `GET /api/attendees` — the attendee directory and the past-attendee recipient
 * source (US-08, TSK-0505).
 *
 * Query parameters, all optional:
 *
 * - `q`            free text matched against name, email and student number
 * - `course`       exact free-text course, matched as stored
 * - `eventId`      only students on that event's roster
 * - `attendedOnly` `true` to return only people marked present at least once
 * - `page`         1-based page number
 * - `pageSize`     rows per page, capped at 100
 *
 * The response also carries `facets.courses`: the distinct courses actually present,
 * so the toolbar's course filter lists real values rather than a fixed set of three.
 *
 * Validation is hand-rolled rather than zod, per the dependency policy: this is
 * four scalar parameters and a shared secret check, which is not a reason to add
 * a validation library to the bundle.
 *
 * The organization timezone rides along with the payload, the same way
 * `/api/events` returns it, so the client formats dates identically wherever it
 * renders them.
 */

class AttendeeQueryError extends Error {}

/** Rejects a parameter that is present but not a positive whole number. */
function readPositiveInteger(
  raw: string | null,
  fallback: number,
  maximum: number
): number {
  if (raw === null || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value < 1) {
    throw new AttendeeQueryError(`Value must be a whole number of at least 1.`);
  }

  if (value > maximum) {
    throw new AttendeeQueryError(`Value must not be greater than ${maximum}.`);
  }

  return value;
}

function readBoolean(raw: string | null): boolean {
  if (raw === null || raw.trim() === "") {
    return false;
  }

  const value = raw.trim().toLowerCase();

  if (value === "true") return true;
  if (value === "false") return false;

  throw new AttendeeQueryError(`Value must be true or false.`);
}

export async function GET(request: Request): Promise<Response> {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) {
    return authorization;
  }

  const params = new URL(request.url).searchParams;
  // Empty means absent for every parameter, so `?q=` and `?page=` behave the same
  // way rather than one of them yielding an empty string the caller has to know
  // to ignore.
  const rawSearch = params.get("q")?.trim();
  const search = rawSearch ? rawSearch : undefined;

  // A bounded term keeps a pasted paragraph from becoming an unbounded scan.
  if (search && search.length > 200) {
    return Response.json(
      { error: "Search text must be 200 characters or fewer." },
      { status: 400 }
    );
  }

  let page: number;
  let pageSize: number;
  let attendedOnly: boolean;

  try {
    page = readPositiveInteger(params.get("page"), 1, 100_000);
    pageSize = readPositiveInteger(params.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    attendedOnly = readBoolean(params.get("attendedOnly"));
  } catch (error) {
    if (error instanceof AttendeeQueryError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }

// Same rule as `q`: an empty parameter means absent, so `?course=` behaves like
  // omitting it rather than filtering for a course nobody wrote.
  const rawCourse = params.get("course")?.trim();
  const rawEventId = params.get("eventId")?.trim();

  const result = await searchGlobalAttendees({
    adminId: authorization.adminId,
    search,
    course: rawCourse ? rawCourse : undefined,
    eventId: rawEventId ? rawEventId : undefined,
    attendedOnly,
    page,
    pageSize,
  });

  return Response.json({ ...result, timezone: getOrganizationTimezone() });
}

/**
 * `POST /api/attendees` — adds one student to the directory.
 *
 * Returns 201 for a new student and 200 for one who had been removed and is now
 * back, with `restored` saying which happened. The two are reported separately
 * because they are different events: one created a record, the other undid a removal
 * and kept the attendance the student already had.
 */
export async function POST(request: Request): Promise<Response> {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) {
    return authorization;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "We could not read that request." }, { status: 400 });
  }

  const input = readAttendeeDetails(body);

  if (!input.valid) {
    return Response.json({ error: input.error.error, field: input.error.field }, { status: 400 });
  }

  try {
    const result = await createAttendee(input.details);

    return Response.json(result, { status: result.restored ? 200 : 201 });
  } catch (error) {
    if (error instanceof AttendeeWriteError) {
      return Response.json(
        { error: error.message },
        { status: error.kind === "not_found" ? 404 : 409 }
      );
    }

    throw error;
  }
}
