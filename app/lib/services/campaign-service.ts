import "server-only";

import { DeliveryStatus, EventStatus, Prisma, QueueJobStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

type CampaignAssetRole = "INLINE" | "ATTACHMENT";

const MAX_SUBJECT_LENGTH = 200;
const MAX_MARKDOWN_LENGTH = 100_000;
const MANUAL_RETRY_ATTEMPTS = 3;

export class CampaignError extends Error {}

export type SubmitCampaignInput = {
  idempotencyKey: string;
  eventId: string;
  attendeeIds: string[];
  subject: string;
  markdown: string;
  createdById: string;
  assets?: { assetId: string; role: CampaignAssetRole }[];
};

type SubmitCampaignDependencies = {
  generateDeliveryIdempotencyKey: () => string;
};

const defaultSubmitCampaignDependencies: SubmitCampaignDependencies = {
  generateDeliveryIdempotencyKey: crypto.randomUUID,
};

export type CampaignListItem = {
  id: string;
  eventId: string;
  subject: string;
  eventName: string;
  venue: string | null;
  startsAt: Date;
  createdAt: Date;
  campaignsCount: number;
  totalStudents: number;
  deliveredCount: number;
  sendingCount: number;
  invalidEmailCount: number;
  pendingCount: number;
  unsentCount: number;
  counts: Record<DeliveryStatus, number>;
};

export type CampaignHistoryItem = {
  id: string;
  subject: string;
  createdAt: Date;
  deliveredCount: number;
};

export type CampaignDetail = CampaignListItem & {
  markdown: string;
  campaignsHistory: CampaignHistoryItem[];
  deliveries: {
    id: string;
    status: DeliveryStatus | "NOT_SENT";
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

function countsFrom(rows: { status: DeliveryStatus; _count?: { _all: number } }[]) {
  const counts: Record<DeliveryStatus, number> = {
    QUEUED: 0,
    SENDING: 0,
    SENT: 0,
    BOUNCED: 0,
    FAILED: 0,
  };

  for (const row of rows) counts[row.status] += row._count?._all ?? 1;
  return counts;
}

export async function submitCampaign(
  input: SubmitCampaignInput,
  dependencies: SubmitCampaignDependencies = defaultSubmitCampaignDependencies,
) {
  const { subject, markdown, attendeeIds } = cleanCampaignInput(input);
  const idempotencyKey = input.idempotencyKey.trim();
  const assetBindings = input.assets ?? [];
  const assetIds = [...new Set(assetBindings.map((asset) => asset.assetId))];

  if (assetIds.length !== assetBindings.length) {
    throw new CampaignError("Each uploaded file can only be added once.");
  }
  if (!idempotencyKey) {
    throw new CampaignError("This email request needs a submission key. Please try again.");
  }

  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction) => {
    const existingCampaign = await transaction.campaign.findUnique({
      where: { idempotencyKey },
      select: { id: true, _count: { select: { emailDeliveries: true } } },
    });
    if (existingCampaign) {
      return { campaignId: existingCampaign.id, queuedCount: existingCampaign._count.emailDeliveries };
    }

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
        idempotencyKey,
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
            idempotencyKey: dependencies.generateDeliveryIdempotencyKey(),
            queueJob: { create: {} },
          },
          select: { id: true },
        }));
    }

    return { campaignId: campaign.id, queuedCount: deliveries.length };
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }

    const duplicateCampaign = await prisma.campaign.findUnique({
      where: { idempotencyKey },
      select: { id: true, _count: { select: { emailDeliveries: true } } },
    });
    if (!duplicateCampaign) throw error;
    return { campaignId: duplicateCampaign.id, queuedCount: duplicateCampaign._count.emailDeliveries };
  }
}

export async function listCampaigns(): Promise<CampaignListItem[]> {
  const events = await getPrismaClient().event.findMany({
    where: { status: { in: [EventStatus.PUBLISHED, EventStatus.DRAFT, EventStatus.CLOSED] } },
    select: {
      id: true,
      name: true,
      venue: true,
      startsAt: true,
      createdAt: true,
      rosterEntries: {
        where: { attendee: { deletedAt: null } },
        select: {
          id: true,
          attendeeId: true,
          deliveries: {
            select: {
              campaignId: true,
              status: true,
            },
          },
        },
      },
      campaigns: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          subject: true,
          createdAt: true,
        },
      },
    },
    orderBy: { startsAt: "desc" },
  });

  return events.map((event) => {
    const latestCampaign = event.campaigns[0];
    const totalStudents = event.rosterEntries.length;
    const counts = countsFrom(latestCampaign
      ? event.rosterEntries.flatMap((entry) =>
          entry.deliveries.filter((delivery) => delivery.campaignId === latestCampaign.id),
        )
      : []);
    const unsentCount = latestCampaign
      ? Math.max(0, totalStudents - Object.values(counts).reduce((total, count) => total + count, 0))
      : totalStudents;
    const subject = latestCampaign ? latestCampaign.subject : "No announcements sent yet";
    const primaryId = latestCampaign ? latestCampaign.id : event.id;

    return {
      id: primaryId,
      eventId: event.id,
      subject,
      eventName: event.name,
      venue: event.venue,
      startsAt: event.startsAt,
      createdAt: latestCampaign ? latestCampaign.createdAt : event.createdAt,
      campaignsCount: event.campaigns.length,
      totalStudents,
      deliveredCount: counts.SENT,
      sendingCount: counts.QUEUED + counts.SENDING,
      invalidEmailCount: counts.FAILED + counts.BOUNCED,
      pendingCount: unsentCount,
      unsentCount,
      counts,
    };
  });
}

export async function getCampaignDetail(targetId: string): Promise<CampaignDetail | null> {
  const prisma = getPrismaClient();

  // 1. Try finding by campaign ID first
  const campaignRecord = await prisma.campaign.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      eventId: true,
      subject: true,
      markdown: true,
      createdAt: true,
    },
  });

  const eventId = campaignRecord?.eventId ?? targetId;

  // 2. Load the event, its roster entries, all campaigns, and deliveries
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      venue: true,
      startsAt: true,
      createdAt: true,
      campaigns: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          subject: true,
          markdown: true,
          createdAt: true,
          emailDeliveries: { select: { status: true } },
        },
      },
      rosterEntries: {
        where: { attendee: { deletedAt: null } },
        orderBy: { attendee: { name: "asc" } },
        select: {
          id: true,
          attendee: {
            select: { id: true, name: true, studentId: true, displayEmail: true, course: true, program: true },
          },
          deliveries: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              campaignId: true,
              status: true,
              provider: true,
              providerMessageId: true,
              failureMessage: true,
              sentAt: true,
              queueJob: { select: { status: true, retryCount: true, scheduledAt: true } },
              attempts: { orderBy: { attemptedAt: "desc" }, take: 1, select: { provider: true, providerMessageId: true, errorMessage: true, attemptedAt: true } },
            },
          },
        },
      },
    },
  });

  if (!event) return null;

  const currentCampaign = campaignRecord ?? event.campaigns[0] ?? null;
  const primaryId = currentCampaign ? currentCampaign.id : event.id;
  const subject = currentCampaign ? currentCampaign.subject : "No announcements sent yet";
  const markdown = currentCampaign ? currentCampaign.markdown : "";
  const createdAt = currentCampaign ? currentCampaign.createdAt : event.createdAt;

  const deliveryRows = event.rosterEntries.flatMap((rosterEntry) =>
    rosterEntry.deliveries.filter((delivery) => delivery.campaignId === currentCampaign?.id),
  );
  const counts = countsFrom(deliveryRows.map((delivery) => ({
    status: delivery.status,
    _count: { _all: 1 },
  })));
  const unsentCount = event.rosterEntries.length - deliveryRows.length;

  const deliveries: CampaignDetail["deliveries"] = event.rosterEntries.map((rosterEntry) => {
    const matchingDelivery = currentCampaign
      ? rosterEntry.deliveries.find((d) => d.campaignId === currentCampaign.id)
      : undefined;

    if (matchingDelivery) {
      return {
        id: matchingDelivery.id,
        status: matchingDelivery.status,
        provider: matchingDelivery.provider,
        providerMessageId: matchingDelivery.providerMessageId,
        failureMessage: matchingDelivery.failureMessage,
        sentAt: matchingDelivery.sentAt,
        attendee: {
          id: rosterEntry.attendee.id,
          name: rosterEntry.attendee.name,
          studentId: rosterEntry.attendee.studentId,
          email: rosterEntry.attendee.displayEmail,
          course: rosterEntry.attendee.course,
          program: rosterEntry.attendee.program,
        },
        queueJob: matchingDelivery.queueJob,
        lastAttempt: matchingDelivery.attempts[0] ?? null,
      };
    }

    return {
      id: rosterEntry.id,
      status: "NOT_SENT" as const,
      provider: null,
      providerMessageId: null,
      failureMessage: null,
      sentAt: null,
      attendee: {
        id: rosterEntry.attendee.id,
        name: rosterEntry.attendee.name,
        studentId: rosterEntry.attendee.studentId,
        email: rosterEntry.attendee.displayEmail,
        course: rosterEntry.attendee.course,
        program: rosterEntry.attendee.program,
      },
      queueJob: null,
      lastAttempt: null,
    };
  });

  const campaignsHistory: CampaignHistoryItem[] = event.campaigns.map((c) => ({
    id: c.id,
    subject: c.subject,
    createdAt: c.createdAt,
    deliveredCount: c.emailDeliveries.filter((d) => d.status === DeliveryStatus.SENT).length,
  }));

  return {
    id: primaryId,
    eventId: event.id,
    subject,
    markdown,
    createdAt,
    eventName: event.name,
    venue: event.venue,
    startsAt: event.startsAt,
    campaignsCount: event.campaigns.length,
    totalStudents: event.rosterEntries.length,
    deliveredCount: counts.SENT,
    sendingCount: counts.QUEUED + counts.SENDING,
    invalidEmailCount: counts.FAILED + counts.BOUNCED,
    pendingCount: unsentCount,
    unsentCount,
    counts,
    deliveries,
    campaignsHistory,
  };
}

export async function retryFailedDeliveries({ campaignId, deliveryIds }: { campaignId: string; deliveryIds: string[] }) {
  const ids = [...new Set(deliveryIds)];
  if (ids.length === 0) throw new CampaignError("Choose at least one failed email to retry.");

  return getPrismaClient().$transaction(async (transaction) => {
    const failed = await transaction.emailDelivery.findMany({
      where: {
        id: { in: ids },
        OR: [{ campaignId }, { eventId: campaignId }],
        status: DeliveryStatus.FAILED,
        queueJob: { status: QueueJobStatus.DEAD_LETTER },
      },
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
      where: {
        id: { in: ids },
        OR: [{ campaignId }, { eventId: campaignId }],
        status: DeliveryStatus.SENT,
      },
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
