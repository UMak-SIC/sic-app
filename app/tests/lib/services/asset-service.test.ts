import { afterEach, expect, test, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ asset: { create } }),
}));

import { createAsset } from "@/lib/services/asset-service";

afterEach(() => {
  vi.resetAllMocks();
});

test("persists validated asset metadata and returns its UUID", async () => {
  create.mockResolvedValue({ id: "asset-id" });

  await expect(
    createAsset({
      objectKey: "assets/asset.webp",
      storageBucket: "PUBLIC_IMAGES",
      originalFilename: "banner.png",
      mediaType: "image/webp",
      byteSize: 3,
      uploadedById: "admin-id",
    }),
  ).resolves.toEqual({ id: "asset-id" });

  expect(create).toHaveBeenCalledWith({
    data: {
      objectKey: "assets/asset.webp",
      storageBucket: "PUBLIC_IMAGES",
      originalFilename: "banner.png",
      mediaType: "image/webp",
      byteSize: BigInt(3),
      uploadedById: "admin-id",
    },
    select: { id: true },
  });
});
