import { requireAdmin } from "@/lib/auth/require-admin";
import {
  deleteShortUrl,
  ShortUrlInputError,
  type ShortUrlUpdateInput,
  updateShortUrl,
} from "@/lib/services/short-url-service";

function parseUpdateInput(body: unknown): ShortUrlUpdateInput {
  if (!body || typeof body !== "object") {
    throw new ShortUrlInputError("Please check the link details.");
  }

  const value = body as Record<string, unknown>;
  if (
    (value.name !== undefined && typeof value.name !== "string") ||
    (value.destination !== undefined && typeof value.destination !== "string") ||
    (value.expiresAt !== undefined && value.expiresAt !== null && typeof value.expiresAt !== "string") ||
    (value.qrForeground !== undefined && typeof value.qrForeground !== "string") ||
    (value.qrBackground !== undefined && typeof value.qrBackground !== "string") ||
    (value.qrLogoAssetId !== undefined && value.qrLogoAssetId !== null && typeof value.qrLogoAssetId !== "string")
  ) {
    throw new ShortUrlInputError("Please check the link details.");
  }

  return {
    ...(value.name !== undefined ? { name: value.name } : {}),
    ...(value.destination !== undefined ? { destination: value.destination } : {}),
    ...(value.expiresAt !== undefined ? { expiresAt: value.expiresAt } : {}),
    ...(value.qrForeground !== undefined ? { qrForeground: value.qrForeground } : {}),
    ...(value.qrBackground !== undefined ? { qrBackground: value.qrBackground } : {}),
    ...(value.qrLogoAssetId !== undefined ? { qrLogoAssetId: value.qrLogoAssetId } : {}),
  } as ShortUrlUpdateInput;
}

function badRequest(error: unknown): Response | null {
  if (error instanceof ShortUrlInputError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return Response.json({ error: "Please check the link details." }, { status: 400 });
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/qr/links/[id]">,
) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  try {
    const link = await updateShortUrl(
      (await params).id,
      parseUpdateInput(await request.json()),
      authorization.adminId,
    );
    if (!link) return Response.json({ error: "Link not found." }, { status: 404 });
    return Response.json({ link });
  } catch (error) {
    const response = badRequest(error);
    if (response) return response;
    throw error;
  }
}

export async function DELETE(
  _: Request,
  { params }: RouteContext<"/api/qr/links/[id]">,
) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  const deleted = await deleteShortUrl((await params).id, authorization.adminId);
  if (!deleted) return Response.json({ error: "Link not found." }, { status: 404 });
  return new Response(null, { status: 204 });
}
