import { requireAdmin } from "@/lib/auth/require-admin";
import { addAttendeesToEvent, isUuid, RosterError } from "@/lib/services/roster-service";

export const runtime = "nodejs";

/**
 * Adds students to an event's roster.
 *
 * Creates the roster entries the rest of the app reads: campaign recipients are
 * built from them, check-in marks them attended, and closing the event marks the
 * ones who never arrived as absent.
 *
 * Returns what it actually did rather than a bare count, so a caller can tell a
 * student who was added from one who was already there or who does not exist.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) {
    return authorization;
  }

  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "We could not read that request." }, { status: 400 });
  }

  const attendeeIds = (body as { attendeeIds?: unknown } | null)?.attendeeIds;

  if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
    return Response.json({ error: "Choose at least one student to add." }, { status: 400 });
  }

  if (!attendeeIds.every((value) => typeof value === "string" && isUuid(value))) {
    return Response.json({ error: "One or more students could not be identified." }, { status: 400 });
  }

  try {
    const result = await addAttendeesToEvent({ eventId: id, attendeeIds: attendeeIds as string[] });

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof RosterError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
