import "server-only";

import { getPrismaClient } from "@/lib/prisma";

type CreateAssetInput = {
  objectKey: string;
  storageBucket: "PRIVATE_IMAGES" | "PUBLIC_IMAGES";
  originalFilename: string;
  mediaType: string;
  byteSize: number;
  uploadedById: string;
};

export async function createAsset({
  objectKey,
  storageBucket,
  originalFilename,
  mediaType,
  byteSize,
  uploadedById,
}: CreateAssetInput): Promise<{ id: string }> {
  return getPrismaClient().asset.create({
    data: {
      objectKey,
      storageBucket,
      originalFilename,
      mediaType,
      byteSize: BigInt(byteSize),
      uploadedById,
    },
    select: { id: true },
  });
}
