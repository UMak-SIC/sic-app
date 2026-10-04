import "server-only";

import { getPrismaClient } from "@/lib/prisma";

type EventInput = {
  name: string;
  details: string;
  /** Free text, so it can hold a building, a room, or both. Absent is null. */
  venue?: string | null;
  startsAt: Date;
  endsAt: Date;
  imageAssetId?: string | null;
};

export class EventLifecycleError extends Error {}

type PublicImageAsset = {
  objectKey: string;
  storageBucket: string | null;
};

export function publicImageUrl(asset: PublicImageAsset | null): string | null {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim();
  if (!asset || asset.storageBucket !== "PUBLIC_IMAGES" || !endpoint) return null;

  try {
    const url = new URL(endpoint);
    url.pathname = `/public-images/${asset.objectKey.split("/").map(encodeURIComponent).join("/")}`;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Bounds the venue so one pasted paragraph cannot become a single "where" cell.
 * A building plus a room is well inside this.
 */
const EVENT_VENUE_MAX_LENGTH = 120;

function validateEventInput(input: EventInput): EventInput {
  const name = input.name.trim();
  const details = input.details.trim();
  // Trimmed and collapsed so " " is stored as absent rather than as a venue an
  // organizer never typed.
  const venue = input.venue?.trim().replace(/\s+/g, " ") || null;

  if (!name || !details) {
    throw new EventLifecycleError("An event requires a name and details.");
  }

  if (venue && venue.length > EVENT_VENUE_MAX_LENGTH) {
    throw new EventLifecycleError(
      `Venue must be at most ${EVENT_VENUE_MAX_LENGTH} characters.`,
    );
  }

  if (
    !Number.isFinite(input.startsAt.getTime()) ||
    !Number.isFinite(input.endsAt.getTime()) ||
    input.endsAt <= input.startsAt
  ) {
    throw new EventLifecycleError("An event must end after it starts.");
  }

  return { ...input, name, details, venue };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function validateBanner(imageAssetId: string | null | undefined): Promise<void> {
  if (!imageAssetId) {
    return;
  }

  if (!UUID_REGEX.test(imageAssetId)) {
    throw new EventLifecycleError("An event banner must be a public uploaded asset.");
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
    include: {
      imageAsset: { select: { originalFilename: true, objectKey: true, storageBucket: true } },
      _count: { select: { rosterEntries: true } },
    },
    orderBy: { startsAt: "desc" },
  });
}

export async function getEvent(eventId: string) {
  return getPrismaClient().event.findUnique({
    where: { id: eventId },
    include: {
      imageAsset: { select: { originalFilename: true, objectKey: true, storageBucket: true } },
      _count: { select: { rosterEntries: true } },
    },
  });
}
