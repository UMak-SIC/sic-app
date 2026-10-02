import "server-only";

import { DeliveryStatus, EventStatus, QueueJobStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

type CampaignAssetRole = "INLINE" | "ATTACHMENT";

const MAX_SUBJECT_LENGTH = 200;
const MAX_MARKDOWN_LENGTH = 100_000;
const MANUAL_RETRY_ATTEMPTS = 3;

export class CampaignError extends Error {}

export type SubmitCampaignInput = {
  eventId: string;
  attendeeIds: string[];
  subject: string;
  markdown: string;
  createdById: string;
  assets?: { assetId: string; role: CampaignAssetRole }[];
};

export type CampaignListItem = {
  id: string;
  subject: string;
  eventName: string;
  venue: string | null;
  startsAt: Date;
  createdAt: Date;
  counts: Record<DeliveryStatus, number>;
};

export type CampaignDetail = CampaignListItem & {
  markdown: string;
  deliveries: {
    id: string;
    status: DeliveryStatus;
    provider: string | null;
    providerMessageId: string | null;
    failureMessage: string | null;
    sentAt: Date | null;
    attendee: {
      id: string;
      name: string;
      studentId: string;
      email: string;
      course: string | null;
      program: string | null;
    };
    queueJob: { status: QueueJobStatus; retryCount: number; scheduledAt: Date } | null;
    lastAttempt: {
      provider: string;
      providerMessageId: string | null;
      errorMessage: string | null;
      attemptedAt: Date;
    } | null;
  }[];
};

function cleanCampaignInput(input: SubmitCampaignInput) {
  const subject = input.subject.trim();
  const markdown = input.markdown.trim();
  const attendeeIds = [...new Set(input.attendeeIds)];

  if (!subject || subject.length > MAX_SUBJECT_LENGTH) {
    throw new CampaignError(`Email subject must be between 1 and ${MAX_SUBJECT_LENGTH} characters.`);
  }
  if (!markdown || markdown.length > MAX_MARKDOWN_LENGTH) {
    throw new CampaignError("Email message is missing or too long.");
  }
  if (attendeeIds.length === 0) {
    throw new CampaignError("Choose at least one student to receive this email.");
  }

  return { subject, markdown, attendeeIds };
}

function countsFrom(rows: { status: DeliveryStatus; _count: { _all: number } }[]) {
  const counts: Record<DeliveryStatus, number> = {
    QUEUED: 0,
    SENDING: 0,
    SENT: 0,
    BOUNCED: 0,
    FAILED: 0,
  };

  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}

export async function submitCampaign(input: SubmitCampaignInput) {
  const { subject, markdown, attendeeIds } = cleanCampaignInput(input);
  const assetBindings = input.assets ?? [];
  const assetIds = [...new Set(assetBindings.map((asset) => asset.assetId))];

  if (assetIds.length !== assetBindings.length) {
    throw new CampaignError("Each uploaded file can only be added once.");
  }

  return getPrismaClient().$transaction(async (transaction) => {
    const event = await transaction.event.findFirst({
      where: { id: input.eventId, status: EventStatus.PUBLISHED },
      select: { id: true },
    });
    if (!event) throw new CampaignError("Choose a published event before sending an email.");

    const attendees = await transaction.attendee.findMany({
      where: { id: { in: attendeeIds }, deletedAt: null },
      select: { id: true },
    });
    if (attendees.length !== attendeeIds.length) {
      throw new CampaignError("One or more selected students are no longer available.");
    }

    if (assetIds.length > 0) {
      const assets = await transaction.asset.findMany({
        where: { id: { in: assetIds } },
        select: { id: true, mediaType: true, storageBucket: true },
      });
      if (assets.length !== assetIds.length) throw new CampaignError("One or more uploaded files are unavailable.");

      const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
      for (const binding of assetBindings) {
        if (binding.role !== "INLINE") continue;
        const asset = assetsById.get(binding.assetId);
        if (!asset || asset.storageBucket !== "PUBLIC_IMAGES" || !asset.mediaType.startsWith("image/")) {
          throw new CampaignError("Campaign banners must be uploaded public images.");
        }
      }
    }

    await transaction.eventRosterEntry.createMany({
      data: attendees.map((attendee) => ({ eventId: event.id, attendeeId: attendee.id })),
      skipDuplicates: true,
    });
    const rosterEntries = await transaction.eventRosterEntry.findMany({
      where: { eventId: event.id, attendeeId: { in: attendees.map((attendee) => attendee.id) } },
      select: { id: true },
    });

    const campaign = await transaction.campaign.create({
      data: {
        eventId: event.id,
        subject,
        markdown,
        createdById: input.createdById,
        assets: assetBindings.length
          ? { create: assetBindings.map((asset) => ({ assetId: asset.assetId, role: asset.role })) }
          : undefined,
      },
      select: { id: true },
    });

    const deliveries: { id: string }[] = [];
    for (const rosterEntry of rosterEntries) {
      deliveries.push(await transaction.emailDelivery.create({
          data: {
            eventId: event.id,
            campaignId: campaign.id,
            rosterEntryId: rosterEntry.id,
            idempotencyKey: crypto.randomUUID(),
            queueJob: { create: {} },
          },
          select: { id: true },
        }));
    }

    return { campaignId: campaign.id, queuedCount: deliveries.length };
  });
}

export async function listCampaigns(): Promise<CampaignListItem[]> {
  const campaigns = await getPrismaClient().campaign.findMany({
    select: {
      id: true,
      subject: true,
      createdAt: true,
      event: { select: { name: true, venue: true, startsAt: true } },
      emailDeliveries: { select: { status: true }, },
    },
    orderBy: { createdAt: "desc" },
  });

  return campaigns.map((campaign) => ({
    id: campaign.id,
    subject: campaign.subject,
    eventName: campaign.event.name,
    venue: campaign.event.venue,
    startsAt: campaign.event.startsAt,
    createdAt: campaign.createdAt,
    counts: countsFrom(Object.entries(campaign.emailDeliveries.reduce<Record<string, number>>((result, delivery) => {
      result[delivery.status] = (result[delivery.status] ?? 0) + 1;
      return result;
    }, {})).map(([status, count]) => ({ status: status as DeliveryStatus, _count: { _all: count } }))),
  }));
}

export async function getCampaignDetail(campaignId: string): Promise<CampaignDetail | null> {
  const campaign = await getPrismaClient().campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      subject: true,
      markdown: true,
      createdAt: true,
      event: { select: { name: true, venue: true, startsAt: true } },
      emailDeliveries: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, status: true, provider: true, providerMessageId: true, failureMessage: true, sentAt: true,
          rosterEntry: { select: { attendee: { select: { id: true, name: true, studentId: true, displayEmail: true, course: true, program: true } } } },
          queueJob: { select: { status: true, retryCount: true, scheduledAt: true } },
          attempts: { orderBy: { attemptedAt: "desc" }, take: 1, select: { provider: true, providerMessageId: true, errorMessage: true, attemptedAt: true } },
        },
      },
    },
  });
  if (!campaign) return null;

  return {
    id: campaign.id, subject: campaign.subject, markdown: campaign.markdown, createdAt: campaign.createdAt,
    eventName: campaign.event.name, venue: campaign.event.venue, startsAt: campaign.event.startsAt,
    counts: countsFrom(Object.entries(campaign.emailDeliveries.reduce<Record<string, number>>((result, delivery) => {
      result[delivery.status] = (result[delivery.status] ?? 0) + 1;
      return result;
    }, {})).map(([status, count]) => ({ status: status as DeliveryStatus, _count: { _all: count } }))),
    deliveries: campaign.emailDeliveries.map((delivery) => ({
      id: delivery.id, status: delivery.status, provider: delivery.provider, providerMessageId: delivery.providerMessageId,
      failureMessage: delivery.failureMessage, sentAt: delivery.sentAt,
      attendee: { id: delivery.rosterEntry.attendee.id, name: delivery.rosterEntry.attendee.name, studentId: delivery.rosterEntry.attendee.studentId, email: delivery.rosterEntry.attendee.displayEmail, course: delivery.rosterEntry.attendee.course, program: delivery.rosterEntry.attendee.program },
      queueJob: delivery.queueJob,
      lastAttempt: delivery.attempts[0] ?? null,
    })),
  };
}

export async function retryFailedDeliveries({ campaignId, deliveryIds }: { campaignId: string; deliveryIds: string[] }) {
  const ids = [...new Set(deliveryIds)];
  if (ids.length === 0) throw new CampaignError("Choose at least one failed email to retry.");

  return getPrismaClient().$transaction(async (transaction) => {
    const failed = await transaction.emailDelivery.findMany({
      where: { id: { in: ids }, campaignId, status: DeliveryStatus.FAILED, queueJob: { status: QueueJobStatus.DEAD_LETTER } },
      select: { id: true, queueJob: { select: { id: true, retryCount: true } } },
    });
    const requeuedIds: string[] = [];
    for (const delivery of failed) {
      if (!delivery.queueJob) continue;
      const result = await transaction.queueJob.updateMany({
        where: { id: delivery.queueJob.id, status: QueueJobStatus.DEAD_LETTER },
        // Preserve attempt history but give the manually retried job a full retry budget.
        data: {
          status: QueueJobStatus.QUEUED,
          scheduledAt: new Date(),
          lockedAt: null,
          lockExpiresAt: null,
          lockedBy: null,
          lastError: null,
          maxRetries: delivery.queueJob.retryCount + MANUAL_RETRY_ATTEMPTS,
        },
      });
      if (result.count === 1) requeuedIds.push(delivery.id);
    }
    if (requeuedIds.length > 0) {
      await transaction.emailDelivery.updateMany({
        where: { id: { in: requeuedIds }, status: DeliveryStatus.FAILED },
        data: { status: DeliveryStatus.QUEUED },
      });
    }
    return { queuedCount: requeuedIds.length, skippedCount: ids.length - requeuedIds.length };
  });
}

/** Requeues completed deliveries only after an operator explicitly confirms a resend. */
export async function requeueDeliveries({ campaignId, deliveryIds }: { campaignId: string; deliveryIds: string[] }) {
  const ids = [...new Set(deliveryIds)];
  if (ids.length === 0) throw new CampaignError("Choose at least one delivered email to requeue.");

  return getPrismaClient().$transaction(async (transaction) => {
    const deliveries = await transaction.emailDelivery.findMany({
      where: { id: { in: ids }, campaignId, status: DeliveryStatus.SENT },
      select: { id: true, queueJob: { select: { id: true } } },
    });
    for (const delivery of deliveries) {
      if (!delivery.queueJob) continue;
      await transaction.queueJob.update({
        where: { id: delivery.queueJob.id },
        data: { status: QueueJobStatus.QUEUED, scheduledAt: new Date(), retryCount: 0, lockedAt: null, lockExpiresAt: null, lockedBy: null, lastError: null },
      });
      await transaction.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: DeliveryStatus.QUEUED, provider: null, providerMessageId: null, sentAt: null, failureCode: null, failureMessage: null },
      });
    }
    return { queuedCount: deliveries.length, skippedCount: ids.length - deliveries.length };
  });
}

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
