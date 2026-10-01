import { requireAdmin } from "@/lib/auth/require-admin";
import { CampaignError, listCampaigns, submitCampaign } from "@/lib/services/campaign-service";
import { isUuid } from "@/lib/services/roster-service";

export const runtime = "nodejs";

type CampaignRequest = {
  eventId?: unknown;
  attendeeIds?: unknown;
  subject?: unknown;
  markdown?: unknown;
  assets?: unknown;
};

export async function GET() {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  return Response.json({ campaigns: await listCampaigns() });
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  const body = await request.json().catch(() => null) as CampaignRequest | null;
  if (!body || typeof body.eventId !== "string" || typeof body.subject !== "string" || typeof body.markdown !== "string" || !Array.isArray(body.attendeeIds) || !body.attendeeIds.every((id) => typeof id === "string")) {
    return Response.json({ error: "Please complete the email details and choose recipients." }, { status: 400 });
  }
  if (!isUuid(body.eventId) || !body.attendeeIds.every(isUuid)) {
    return Response.json({ error: "One or more selected records could not be identified." }, { status: 400 });
  }
  const assetsAreValid = body.assets === undefined || (Array.isArray(body.assets) && body.assets.every((asset) => asset && typeof asset === "object" && typeof (asset as { assetId?: unknown }).assetId === "string" && ((asset as { role?: unknown }).role === "INLINE" || (asset as { role?: unknown }).role === "ATTACHMENT")));
  if (!assetsAreValid) return Response.json({ error: "One or more uploaded files could not be used." }, { status: 400 });
  const assets = (body.assets ?? []) as { assetId: string; role: "INLINE" | "ATTACHMENT" }[];
  if (!assets.every((asset) => isUuid(asset.assetId))) return Response.json({ error: "One or more uploaded files could not be used." }, { status: 400 });

  try {
    const campaign = await submitCampaign({ eventId: body.eventId, attendeeIds: body.attendeeIds, subject: body.subject, markdown: body.markdown, assets, createdById: authorization.adminId });
    return Response.json(campaign, { status: 201 });
  } catch (error) {
    if (error instanceof CampaignError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
