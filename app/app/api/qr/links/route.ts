import { requireAdmin } from "@/lib/auth/require-admin";
import {
  createShortUrl,
  listShortUrls,
  ShortUrlInputError,
  type ShortUrlInput,
} from "@/lib/services/short-url-service";

function parseCreateInput(body: unknown): ShortUrlInput {
  if (!body || typeof body !== "object") {
    throw new ShortUrlInputError("Please check the link details.");
  }

  const value = body as Record<string, unknown>;
  if (
    typeof value.destination !== "string" ||
    (value.name !== undefined && typeof value.name !== "string") ||
    (value.expiresAt !== undefined && value.expiresAt !== null && typeof value.expiresAt !== "string") ||
    (value.qrForeground !== undefined && typeof value.qrForeground !== "string") ||
    (value.qrBackground !== undefined && typeof value.qrBackground !== "string") ||
    (value.qrLogoAssetId !== undefined && value.qrLogoAssetId !== null && typeof value.qrLogoAssetId !== "string")
  ) {
    throw new ShortUrlInputError("Please check the link details.");
  }

  return {
    name: value.name as string | undefined,
    destination: value.destination,
    expiresAt: (value.expiresAt as string | null | undefined) ?? null,
    qrForeground: value.qrForeground as string | undefined,
    qrBackground: value.qrBackground as string | undefined,
    qrLogoAssetId: (value.qrLogoAssetId as string | null | undefined) ?? null,
  };
}

function inputError(error: unknown): Response | null {
  if (error instanceof ShortUrlInputError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return Response.json({ error: "Please check the link details." }, { status: 400 });
  }
  return null;
}

export async function GET() {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  return Response.json({ links: await listShortUrls(authorization.adminId) });
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  try {
    const link = await createShortUrl(
      parseCreateInput(await request.json()),
      authorization.adminId,
    );
    return Response.json({ link }, { status: 201 });
  } catch (error) {
    const response = inputError(error);
    if (response) return response;
    throw error;
  }
}
