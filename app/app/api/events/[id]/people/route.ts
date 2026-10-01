import { requireAdmin } from "@/lib/auth/require-admin";
import { EventOrganizerError, getEventPeople, saveEventPeople } from "@/lib/services/event-organizer-service";
import { isUuid } from "@/lib/services/roster-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const people = await getEventPeople((await params).id);
  return people ? Response.json(people) : Response.json({ error: "Event not found." }, { status: 404 });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const body = (await request.json().catch(() => null)) as { attendeeIds?: unknown; organizerIds?: unknown } | null;
  const valid = (ids: unknown) => Array.isArray(ids) && ids.every((id) => typeof id === "string" && isUuid(id));
  if (!valid(body?.attendeeIds) || !valid(body?.organizerIds)) return Response.json({ error: "Choose people from the attendee directory." }, { status: 400 });
  try {
    return Response.json(await saveEventPeople((await params).id, body!.attendeeIds as string[], body!.organizerIds as string[]));
  } catch (error) {
    if (error instanceof EventOrganizerError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
