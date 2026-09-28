import "server-only";

import { getPrismaClient } from "@/lib/prisma";

type CreateAssetInput = {
  objectKey: string;
  originalFilename: string;
  mediaType: string;
  byteSize: number;
  uploadedById: string;
};

export async function createAsset({
  objectKey,
  originalFilename,
  mediaType,
  byteSize,
  uploadedById,
}: CreateAssetInput): Promise<{ id: string }> {
  return getPrismaClient().asset.create({
    data: {
      objectKey,
      originalFilename,
      mediaType,
      byteSize: BigInt(byteSize),
      uploadedById,
    },
    select: { id: true },
  });
}
