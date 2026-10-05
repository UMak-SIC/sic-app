import { requireAdmin } from "@/lib/auth/require-admin";
import { getPrismaClient } from "@/lib/prisma";
import { publicImageUrl } from "@/lib/services/event-service";

export async function GET() {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  const assets = await getPrismaClient().asset.findMany({
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      objectKey: true,
      storageBucket: true,
      originalFilename: true,
      mediaType: true,
      byteSize: true,
      uploadedAt: true,
      eventImages: { select: { id: true, name: true } },
      campaignAssets: {
        select: {
          id: true,
          role: true,
          campaign: { select: { id: true, subject: true } },
        },
      },
    },
  });

  return Response.json({
    assets: assets.map((asset) => ({
      id: asset.id,
      objectKey: asset.objectKey,
      originalFilename: asset.originalFilename,
      mediaType: asset.mediaType,
      byteSize: Number(asset.byteSize),
      uploadedAt: asset.uploadedAt,
      url: publicImageUrl(asset),
      references: [
        ...asset.eventImages.map((event) => ({
          id: event.id,
          entityId: event.id,
          entityType: "event" as const,
          entityTitle: event.name,
          role: "cover" as const,
          isLocked: true,
        })),
        ...asset.campaignAssets.map((campaignAsset) => ({
          id: campaignAsset.id,
          entityId: campaignAsset.campaign.id,
          entityType: "campaign" as const,
          entityTitle: campaignAsset.campaign.subject,
          role: campaignAsset.role === "INLINE" ? "banner" as const : "attachment" as const,
          isLocked: true,
        })),
      ],
    })),
  });
}
