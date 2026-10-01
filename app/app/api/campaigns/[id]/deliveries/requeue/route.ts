import { requireAdmin } from "@/lib/auth/require-admin";
import { CampaignError, requeueDeliveries } from "@/lib/services/campaign-service";
import { isUuid } from "@/lib/services/roster-service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const body = await request.json().catch(() => null) as { deliveryIds?: unknown } | null;
  if (!Array.isArray(body?.deliveryIds) || !body.deliveryIds.every((id) => typeof id === "string" && isUuid(id))) {
    return Response.json({ error: "Choose delivered emails to requeue." }, { status: 400 });
  }
  try {
    return Response.json(await requeueDeliveries({ campaignId: (await params).id, deliveryIds: body.deliveryIds }));
  } catch (error) {
    if (error instanceof CampaignError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
