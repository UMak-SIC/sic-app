import "server-only";

import { getPrismaClient } from "@/lib/prisma";

type EventInput = {
  name: string;
  details: string;
  startsAt: Date;
  endsAt: Date;
  imageAssetId?: string | null;
};

export class EventLifecycleError extends Error {}

function validateEventInput(input: EventInput): EventInput {
  const name = input.name.trim();
  const details = input.details.trim();

  if (!name || !details) {
    throw new EventLifecycleError("An event requires a name and details.");
  }

  if (
    !Number.isFinite(input.startsAt.getTime()) ||
    !Number.isFinite(input.endsAt.getTime()) ||
    input.endsAt <= input.startsAt
  ) {
    throw new EventLifecycleError("An event must end after it starts.");
  }

  return { ...input, name, details };
}

async function validateBanner(imageAssetId: string | null | undefined): Promise<void> {
  if (!imageAssetId) {
    return;
  }

  const asset = await getPrismaClient().asset.findFirst({
    where: { id: imageAssetId, storageBucket: "PUBLIC_IMAGES" },
    select: { id: true },
  });

  if (!asset) {
    throw new EventLifecycleError("An event banner must be a public uploaded asset.");
  }
}

export async function createEvent(input: EventInput, createdById: string) {
  const event = validateEventInput(input);
  await validateBanner(event.imageAssetId);

  return getPrismaClient().event.create({
    data: { ...event, createdById },
  });
}

export async function updateDraft(eventId: string, input: EventInput) {
  const event = validateEventInput(input);
  await validateBanner(event.imageAssetId);

  const result = await getPrismaClient().event.updateMany({
    where: { id: eventId, status: "DRAFT" },
    data: event,
  });

  if (result.count !== 1) {
    throw new EventLifecycleError("Only draft events can be edited.");
  }
}

export async function publishEvent(eventId: string) {
  const event = await getPrismaClient().event.findFirst({
    where: { id: eventId, status: "DRAFT" },
    select: {
      name: true,
      details: true,
      startsAt: true,
      endsAt: true,
      imageAssetId: true,
    },
  });

  if (!event) {
    throw new EventLifecycleError("Only draft events can be published.");
  }

  validateEventInput(event);
  await validateBanner(event.imageAssetId);

  const result = await getPrismaClient().event.updateMany({
    where: { id: eventId, status: "DRAFT" },
    data: { status: "PUBLISHED" },
  });

  if (result.count !== 1) {
    throw new EventLifecycleError("The event changed before it could be published.");
  }
}

export async function listEvents() {
  return getPrismaClient().event.findMany({
    include: { imageAsset: true },
    orderBy: { startsAt: "desc" },
  });
}

export async function getEvent(eventId: string) {
  return getPrismaClient().event.findUnique({
    where: { id: eventId },
    include: { imageAsset: true },
  });
}
