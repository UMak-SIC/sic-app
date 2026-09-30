import { requireAdmin } from "@/lib/auth/require-admin";
import { getPrismaClient } from "@/lib/prisma";

export async function GET() {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  const assets = await getPrismaClient().asset.findMany({
    where: { storageBucket: "PUBLIC_IMAGES" },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, originalFilename: true, mediaType: true },
  });

  return Response.json({ assets });
}
