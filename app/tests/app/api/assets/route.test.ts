import { afterEach, expect, test, vi } from "vitest";

const { findMany, publicImageUrl, requireAdmin } = vi.hoisted(() => ({
  findMany: vi.fn(),
  publicImageUrl: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => ({ asset: { findMany } }) }));
vi.mock("@/lib/services/event-service", () => ({ publicImageUrl }));

import { GET } from "@/app/api/assets/route";

afterEach(() => {
  vi.resetAllMocks();
});

test("returns stored assets with their event and campaign references", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  publicImageUrl.mockReturnValue("https://storage.example/public-images/assets/banner.webp");
  findMany.mockResolvedValue([
    {
      id: "asset-id",
      objectKey: "assets/banner.webp",
      storageBucket: "PUBLIC_IMAGES",
      originalFilename: "banner.webp",
      mediaType: "image/webp",
      byteSize: BigInt(1024),
      uploadedAt: new Date("2026-10-05T09:00:00.000Z"),
      eventImages: [{ id: "event-id", name: "General Assembly" }],
      campaignAssets: [{
        id: "campaign-asset-id",
        role: "ATTACHMENT",
        campaign: { id: "campaign-id", subject: "Event reminder" },
      }],
    },
  ]);

  const response = await GET();

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    assets: [{
      id: "asset-id",
      objectKey: "assets/banner.webp",
      originalFilename: "banner.webp",
      mediaType: "image/webp",
      byteSize: 1024,
      uploadedAt: "2026-10-05T09:00:00.000Z",
      url: "https://storage.example/public-images/assets/banner.webp",
      references: [
        {
          id: "event-id",
          entityId: "event-id",
          entityType: "event",
          entityTitle: "General Assembly",
          role: "cover",
          isLocked: true,
        },
        {
          id: "campaign-asset-id",
          entityId: "campaign-id",
          entityType: "campaign",
          entityTitle: "Event reminder",
          role: "attachment",
          isLocked: true,
        },
      ],
    }],
  });
});

test("returns the authorization response before accessing assets", async () => {
  const unauthorized = Response.json({ error: "Unauthorized" }, { status: 401 });
  requireAdmin.mockResolvedValue(unauthorized);

  const response = await GET();

  expect(response).toBe(unauthorized);
  expect(findMany).not.toHaveBeenCalled();
});
