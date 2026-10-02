import { requireAdmin } from "@/lib/auth/require-admin";
import { getCampaignDetail } from "@/lib/services/campaign-service";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const campaign = await getCampaignDetail((await params).id);
  return campaign ? Response.json({ campaign }) : Response.json({ error: "Email campaign not found." }, { status: 404 });
}
