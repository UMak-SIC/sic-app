import { requireAdmin } from "@/lib/auth/require-admin";
import { getPrismaClient } from "@/lib/prisma";
import { publicImageUrl } from "@/lib/services/event-service";

export async function GET() {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  const assets = await getPrismaClient().asset.findMany({
    where: { storageBucket: "PUBLIC_IMAGES" },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      originalFilename: true,
      mediaType: true,
      objectKey: true,
      storageBucket: true,
      byteSize: true,
      uploadedAt: true,
    },
  });

  return Response.json({
    assets: assets.map((asset) => ({
      id: asset.id,
      originalFilename: asset.originalFilename,
      mediaType: asset.mediaType,
      byteSize: Number(asset.byteSize),
      uploadedAt: asset.uploadedAt,
      url: publicImageUrl(asset),
    })),
  });
}
