import { requireAdmin } from "@/lib/auth/require-admin";
import { isUuid } from "@/lib/services/roster-service";
import {
  setShortUrlStatus,
  ShortUrlInputError,
} from "@/lib/services/short-url-service";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/qr/links/[id]/status">,
) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "Link not found." }, { status: 404 });

  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || !("status" in body)) {
      throw new ShortUrlInputError("Choose whether the link is active or paused.");
    }

    const status = (body as Record<string, unknown>).status;
    if (status !== "ACTIVE" && status !== "DISABLED") {
      throw new ShortUrlInputError("Choose whether the link is active or paused.");
    }

    const link = await setShortUrlStatus(id, status, authorization.adminId);
    if (!link) return Response.json({ error: "Link not found." }, { status: 404 });
    return Response.json({ link });
  } catch (error) {
    if (error instanceof ShortUrlInputError || error instanceof SyntaxError) {
      return Response.json(
        { error: error instanceof ShortUrlInputError ? error.message : "Please check the link details." },
        { status: 400 },
      );
    }
    throw error;
  }
}
