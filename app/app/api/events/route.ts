import { requireAdmin } from "@/lib/auth/require-admin";
import {
  createEvent,
  EventLifecycleError,
  listEvents,
} from "@/lib/services/event-service";
import { getOrganizationTimezone } from "@/lib/events/organization-timezone";

function parseEventInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new EventLifecycleError("Please complete the event details.");
  }

  const input = body as Record<string, unknown>;
  if (
    typeof input.name !== "string" ||
    typeof input.details !== "string" ||
    typeof input.startsAt !== "string" ||
    typeof input.endsAt !== "string" ||
    (input.imageAssetId !== undefined && input.imageAssetId !== null && typeof input.imageAssetId !== "string")
  ) {
    throw new EventLifecycleError("Please complete the event details.");
  }

  return {
    name: input.name,
    details: input.details,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    imageAssetId: input.imageAssetId ?? null,
  };
}

export async function GET() {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  return Response.json({ events: await listEvents(), timezone: getOrganizationTimezone() });
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  try {
    const event = await createEvent(parseEventInput(await request.json()), authorization.adminId);
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof EventLifecycleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
