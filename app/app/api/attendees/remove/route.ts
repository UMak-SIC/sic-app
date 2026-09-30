import { requireAdmin } from "@/lib/auth/require-admin";
import { AttendeeWriteError, removeAttendees } from "@/lib/services/attendee-service";
import { isUuid } from "@/lib/services/roster-service";

export const runtime = "nodejs";

/**
 * `POST /api/attendees/remove` — takes several students out of the directory.
 *
 * A POST rather than a `DELETE` with a body, because the route is about a set of ids
 * rather than one resource and a request body on DELETE is not something every proxy
 * in front of this will pass through.
 *
 * Deliberately all-or-nothing. One request that removes everybody the operator
 * selected is a different promise from fifty requests that each might fail, and a bulk
 * removal that quietly did half of what was asked is the outcome worth avoiding.
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

  const ids = (body as { ids?: unknown } | null)?.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: "Choose at least one student to remove." }, { status: 400 });
  }

  if (!ids.every((value) => typeof value === "string" && isUuid(value))) {
    return Response.json(
      { error: "One or more students could not be identified." },
      { status: 400 }
    );
  }

  try {
    const result = await removeAttendees({ ids: ids as string[] });

    // 200 even when nothing was removed, because rows that were already gone or
    // matched nobody are a reported outcome rather than a failure. The counts say
    // what happened.
    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AttendeeWriteError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
