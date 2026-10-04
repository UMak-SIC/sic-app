import { afterEach, expect, test, vi } from "vitest";

const { campaignAsset, transaction } = vi.hoisted(() => ({
  campaignAsset: { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ campaignAsset, $transaction: transaction }),
}));

import {
  bindCampaignAsset,
  bindCampaignAssets,
  listCampaignAssets,
  unbindCampaignAsset,
} from "@/lib/services/campaign-service";

const CAMPAIGN_ID = "3f1c0f6e-2f5a-4a3f-9d2b-7c1e5a9b0d34";
const ASSET_ID = "9b2d4e6f-1a3c-4b5d-8e7f-0a1b2c3d4e5f";
const OTHER_CAMPAIGN_ID = "00000000-0000-4000-8000-000000000000";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "binding-id",
    campaignId: CAMPAIGN_ID,
    assetId: ASSET_ID,
    role: "INLINE" as const,
    createdAt: new Date("2026-09-30T00:00:00.000Z"),
    asset: {
      originalFilename: "poster.png",
      mediaType: "image/png",
      // BigInt() rather than a 2048n literal: the build's TS target is below
      // ES2020, and asset-service.ts converts the same way.
      byteSize: BigInt(2048),
      objectKey: "campaigns/abc/poster.png",
    },
    ...overrides,
  };
}

afterEach(() => {
  vi.resetAllMocks();
});

test("binds an asset to a campaign", async () => {
  campaignAsset.upsert.mockResolvedValue(row());

  const binding = await bindCampaignAsset({
    campaignId: CAMPAIGN_ID,
    assetId: ASSET_ID,
    role: "INLINE",
  });

  // The upsert keys on the DMA-13 composite unique, so re-binding the same asset
  // under a new role updates rather than colliding with a duplicate.
  expect(campaignAsset.upsert).toHaveBeenCalledWith({
    where: { campaignId_assetId: { campaignId: CAMPAIGN_ID, assetId: ASSET_ID } },
    create: { campaignId: CAMPAIGN_ID, assetId: ASSET_ID, role: "INLINE" },
    update: { role: "INLINE" },
    select: expect.any(Object),
  });

  expect(binding).toMatchObject({
    campaignId: CAMPAIGN_ID,
    assetId: ASSET_ID,
    role: "INLINE",
    originalFilename: "poster.png",
    mediaType: "image/png",
    byteSize: BigInt(2048),
    objectKey: "campaigns/abc/poster.png",
  });
});

test("changing a role preserves the binding id and created_at", async () => {
  const original = row();
  campaignAsset.upsert
    .mockResolvedValueOnce(original)
    .mockResolvedValueOnce(row({ role: "ATTACHMENT" }));

  await bindCampaignAsset({
    campaignId: CAMPAIGN_ID,
    assetId: ASSET_ID,
    role: "INLINE",
  });
  const rebound = await bindCampaignAsset({
    campaignId: CAMPAIGN_ID,
    assetId: ASSET_ID,
    role: "ATTACHMENT",
  });

  // `update` only touches role, so attachment ordering stays stable when an
  // operator changes an asset's role instead of re-adding the file.
  expect(campaignAsset.upsert.mock.calls[1][0].update).toEqual({
    role: "ATTACHMENT",
  });
  expect(rebound.id).toBe(original.id);
  expect(rebound.createdAt).toEqual(original.createdAt);
});

test("binds several assets atomically", async () => {
  const upsertInTransaction = vi
    .fn()
    .mockResolvedValueOnce(row())
    .mockResolvedValueOnce(row({ id: "second-binding-id" }));

  transaction.mockImplementation(async (callback) =>
    callback({ campaignAsset: { upsert: upsertInTransaction } })
  );

  const bindings = await bindCampaignAssets({
    campaignId: CAMPAIGN_ID,
    bindings: [
      { campaignId: CAMPAIGN_ID, assetId: ASSET_ID, role: "INLINE" },
      { campaignId: CAMPAIGN_ID, assetId: ASSET_ID, role: "ATTACHMENT" },
    ],
  });

  expect(transaction).toHaveBeenCalledTimes(1);
  expect(bindings.map((binding) => binding.id)).toEqual([
    "binding-id",
    "second-binding-id",
  ]);
});

test("takes the campaign from the argument, not from each binding", async () => {
  const upsertInTransaction = vi.fn().mockResolvedValue(row());
  transaction.mockImplementation(async (callback) =>
    callback({ campaignAsset: { upsert: upsertInTransaction } })
  );

  await bindCampaignAssets({
    campaignId: CAMPAIGN_ID,
    // A mismatched campaignId on an entry must not attach the asset elsewhere.
    bindings: [
      { campaignId: OTHER_CAMPAIGN_ID, assetId: ASSET_ID, role: "INLINE" },
    ],
  });

  expect(upsertInTransaction.mock.calls[0][0].create).toMatchObject({
    campaignId: CAMPAIGN_ID,
  });
});

test("reads a campaign's assets in the decided order", async () => {
  campaignAsset.findMany.mockResolvedValue([row()]);

  await listCampaignAssets({ campaignId: CAMPAIGN_ID });

  // DMA-13 dropped the stored ordinal: inline order comes from the Markdown AST,
  // and attachments sort by filename with created_at breaking ties.
  expect(campaignAsset.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { campaignId: CAMPAIGN_ID },
      orderBy: [
        { role: "asc" },
        { asset: { originalFilename: "asc" } },
        { createdAt: "asc" },
      ],
    })
  );
});

test("unbinds an asset from a campaign only", async () => {
  await unbindCampaignAsset({ campaignId: CAMPAIGN_ID, assetId: ASSET_ID });

  expect(campaignAsset.deleteMany).toHaveBeenCalledWith({
    where: { campaignId: CAMPAIGN_ID, assetId: ASSET_ID },
  });
});
