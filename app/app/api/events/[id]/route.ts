import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrganizationTimezone } from "@/lib/events/organization-timezone";
import { EventLifecycleError, getEvent, publicImageUrl, updateDraft } from "@/lib/services/event-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  const event = await getEvent((await params).id);
  if (!event) return Response.json({ error: "Event not found." }, { status: 404 });

  return Response.json({
    event: { ...event, bannerUrl: publicImageUrl(event.imageAsset) },
    timezone: getOrganizationTimezone(),
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  try {
    const body = await request.json();
    if (!body || typeof body !== "object") throw new EventLifecycleError("Please complete the event details.");
    const input = body as Record<string, unknown>;
    if (
      typeof input.name !== "string" ||
      typeof input.details !== "string" ||
      typeof input.startsAt !== "string" ||
      typeof input.endsAt !== "string" ||
      (input.venue !== undefined && input.venue !== null && typeof input.venue !== "string") ||
      (input.imageAssetId !== undefined && input.imageAssetId !== null && typeof input.imageAssetId !== "string")
    ) {
      throw new EventLifecycleError("Please complete the event details.");
    }

    await updateDraft((await params).id, {
      name: input.name,
      details: input.details,
      venue: input.venue ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      imageAssetId: input.imageAssetId ?? null,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof EventLifecycleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
