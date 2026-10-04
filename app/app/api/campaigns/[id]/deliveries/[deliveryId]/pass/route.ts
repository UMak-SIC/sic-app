import { requireAdmin } from "@/lib/auth/require-admin";
import { renderQrTicketDataUrl } from "@/lib/email/qr-image-generator";
import { getPrismaClient } from "@/lib/prisma";
import { signQrTicket } from "@/lib/security/qr-signer";
import { isUuid } from "@/lib/services/roster-service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; deliveryId: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const { id: campaignId, deliveryId } = await params;
  if (!isUuid(campaignId) || !isUuid(deliveryId)) {
    return Response.json({ error: "That delivery could not be identified." }, { status: 400 });
  }

  const delivery = await getPrismaClient().emailDelivery.findFirst({
    where: {
      id: deliveryId,
      OR: [{ campaignId }, { eventId: campaignId }],
    },
    select: {
      rosterEntry: { select: { id: true } },
      campaign: { select: { event: { select: { id: true, startsAt: true, endsAt: true } } } },
    },
  });

  let eventId: string;
  let rosterEntryId: string;
  let startsAt: Date;
  let endsAt: Date;

  if (delivery) {
    eventId = delivery.campaign.event.id;
    rosterEntryId = delivery.rosterEntry.id;
    startsAt = delivery.campaign.event.startsAt;
    endsAt = delivery.campaign.event.endsAt;
  } else {
    const rosterEntry = await getPrismaClient().eventRosterEntry.findFirst({
      where: {
        id: deliveryId,
        OR: [{ eventId: campaignId }, { event: { campaigns: { some: { id: campaignId } } } }],
      },
      select: {
        id: true,
        eventId: true,
        event: { select: { id: true, startsAt: true, endsAt: true } },
      },
    });
    if (!rosterEntry) return Response.json({ error: "That delivery was not found." }, { status: 404 });
    eventId = rosterEntry.event.id;
    rosterEntryId = rosterEntry.id;
    startsAt = rosterEntry.event.startsAt;
    endsAt = rosterEntry.event.endsAt;
  }

  try {
    const ticket = signQrTicket({
      eventId,
      rosterEntryId,
      startsAt,
      endsAt,
    });
    return Response.json({ qrDataUrl: await renderQrTicketDataUrl(ticket) });
  } catch {
    return Response.json({ error: "The ticket preview is unavailable. Check the ticket signing setup." }, { status: 503 });
  }
}
