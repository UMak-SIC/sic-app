import "server-only";

import { getPrismaClient } from "@/lib/prisma";

type CampaignAssetRole = "INLINE" | "ATTACHMENT";

type BindCampaignAssetInput = {
  campaignId: string;
  assetId: string;
  role: CampaignAssetRole;
};

type BindCampaignAssetsInput = {
  campaignId: string;
  bindings: BindCampaignAssetInput[];
};

export type CampaignAssetBinding = {
  id: string;
  campaignId: string;
  assetId: string;
  role: CampaignAssetRole;
  createdAt: Date;
  originalFilename: string;
  mediaType: string;
  byteSize: bigint;
  objectKey: string;
};

const bindingSelect = {
  id: true,
  campaignId: true,
  assetId: true,
  role: true,
  createdAt: true,
  asset: {
    select: {
      originalFilename: true,
      mediaType: true,
      byteSize: true,
      objectKey: true,
    },
  },
} as const;

type BindingRow = {
  id: string;
  campaignId: string;
  assetId: string;
  role: CampaignAssetRole;
  createdAt: Date;
  asset: {
    originalFilename: string;
    mediaType: string;
    byteSize: bigint;
    objectKey: string;
  };
};

function toBinding(row: BindingRow): CampaignAssetBinding {
  return {
    id: row.id,
    campaignId: row.campaignId,
    assetId: row.assetId,
    role: row.role,
    createdAt: row.createdAt,
    originalFilename: row.asset.originalFilename,
    mediaType: row.asset.mediaType,
    byteSize: row.asset.byteSize,
    objectKey: row.asset.objectKey,
  };
}

/**
 * Binds one uploaded asset to a campaign, or changes its role if it is already
 * bound.
 *
 * The unique key is (campaign_id, asset_id), so an asset can hold exactly one
 * role per campaign. That is what makes this an upsert: re-binding an asset to
 * a different role updates the row rather than failing on a duplicate, and the
 * original binding id and created_at survive, which keeps attachment ordering
 * stable when an operator changes an asset's role.
 */
export async function bindCampaignAsset({
  campaignId,
  assetId,
  role,
}: BindCampaignAssetInput): Promise<CampaignAssetBinding> {
  const row = await getPrismaClient().campaignAsset.upsert({
    where: { campaignId_assetId: { campaignId, assetId } },
    create: { campaignId, assetId, role },
    update: { role },
    select: bindingSelect,
  });

  return toBinding(row as BindingRow);
}

/**
 * Binds several assets in one transaction.
 *
 * Either every binding lands or none does, so a campaign cannot end up with
 * half of an asset set applied after a failure partway through.
 */
export async function bindCampaignAssets({
  campaignId,
  bindings,
}: BindCampaignAssetsInput): Promise<CampaignAssetBinding[]> {
  return getPrismaClient().$transaction(async (transaction) => {
    const rows: BindingRow[] = [];

    for (const binding of bindings) {
      // The campaign id is taken from the argument, not from each binding, so a
      // mismatched entry cannot quietly attach an asset to a different campaign.
      const row = await transaction.campaignAsset.upsert({
        where: {
          campaignId_assetId: { campaignId, assetId: binding.assetId },
        },
        create: { campaignId, assetId: binding.assetId, role: binding.role },
        update: { role: binding.role },
        select: bindingSelect,
      });

      rows.push(row as BindingRow);
    }

    return rows.map(toBinding);
  });
}

/** Removes one asset from a campaign. Deleting the asset itself is a separate concern. */
export async function unbindCampaignAsset({
  campaignId,
  assetId,
}: {
  campaignId: string;
  assetId: string;
}): Promise<void> {
  await getPrismaClient().campaignAsset.deleteMany({ where: { campaignId, assetId } });
}

/**
 * Reads a campaign's bound assets, ordered for rendering.
 *
 * DMA-13 derives inline order from the Markdown AST rather than a stored
 * ordinal, so inline assets come back grouped by role and left to the renderer.
 * Attachments have no intrinsic order, so they sort alphabetically by original
 * filename with created_at breaking ties, which makes the list deterministic
 * when two files share a name.
 */
export async function listCampaignAssets({
  campaignId,
}: {
  campaignId: string;
}): Promise<CampaignAssetBinding[]> {
  const rows = await getPrismaClient().campaignAsset.findMany({
    where: { campaignId },
    select: bindingSelect,
    orderBy: [{ role: "asc" }, { asset: { originalFilename: "asc" } }, { createdAt: "asc" }],
  });

  return (rows as unknown as BindingRow[]).map(toBinding);
}
