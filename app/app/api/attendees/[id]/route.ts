import { requireAdmin } from "@/lib/auth/require-admin";
import { AttendeeWriteError, softDeleteAttendee, updateAttendee } from "@/lib/services/attendee-service";
import { isUuid } from "@/lib/services/roster-service";
import { readAttendeeChanges } from "@/lib/validation/attendee-validation";

export const runtime = "nodejs";

/**
 * `PATCH /api/attendees/[id]` — edits one student, and `DELETE` removes them.
 *
 * Both act on a single record, so both refuse an id that is not a UUID before
 * touching the database rather than letting a malformed path reach a query.
 */

/** Maps a refusal onto a status: absent is 404, a taken identity is 409. */
function refuse(error: unknown): Response | null {
  if (error instanceof AttendeeWriteError) {
    return Response.json(
      { error: error.message },
      { status: error.kind === "not_found" ? 404 : 409 }
    );
  }

  return null;
}

async function readBody(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return Response.json({ error: "We could not read that request." }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) {
    return authorization;
  }

  const { id } = await params;

  if (!isUuid(id)) {
    return Response.json({ error: "That student could not be identified." }, { status: 400 });
  }

  const body = await readBody(request);
  if (body instanceof Response) {
    return body;
  }

  // Only the fields that were sent are changed. Sending the whole record would
  // overwrite whatever the caller did not mean to touch.
  const input = readAttendeeChanges(body);

  if (!input.valid) {
    return Response.json({ error: input.error.error, field: input.error.field }, { status: 400 });
  }

  try {
    const result = await updateAttendee({ id, changes: input.changes });

    return Response.json(result, { status: 200 });
  } catch (error) {
    const response = refuse(error);

    if (response) return response;

    throw error;
  }
}

/**
 * Removes a student from the directory.
 *
 * The record itself is kept so roster entries and delivery history still point at a
 * real person, and so adding the student again brings back the attendance they had.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) {
    return authorization;
  }

  const { id } = await params;

  if (!isUuid(id)) {
    return Response.json({ error: "That student could not be identified." }, { status: 400 });
  }

  try {
    const result = await softDeleteAttendee({ id });

    return Response.json(result, { status: 200 });
  } catch (error) {
    const response = refuse(error);

    if (response) return response;

    throw error;
  }
}
