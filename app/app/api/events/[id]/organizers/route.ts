import { requireAdmin } from "@/lib/auth/require-admin";
import {
  EventOrganizerError,
  listEventOrganizerIds,
  setEventOrganizers,
} from "@/lib/services/event-organizer-service";
import { isUuid } from "@/lib/services/roster-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  return Response.json({ organizerIds: await listEventOrganizerIds((await params).id) });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  const body = (await request.json().catch(() => null)) as { attendeeIds?: unknown } | null;
  if (!Array.isArray(body?.attendeeIds) || !body.attendeeIds.every((id) => typeof id === "string" && isUuid(id))) {
    return Response.json({ error: "Choose people from the attendee directory." }, { status: 400 });
  }

  try {
    await setEventOrganizers((await params).id, body.attendeeIds);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof EventOrganizerError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
