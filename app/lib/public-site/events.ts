import "server-only";

import type { EventStatus, Prisma } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { publicImageUrl } from "@/lib/services/event-service";

import { describeVideoLink, type VideoLink } from "./video-links";

/**
 * Event reads for the public site (PS-02, PS-04, PS-05, PS-14).
 *
 * Every public page reads events through this module, never through Prisma
 * directly (tests/lib/public-site/boundary.test.ts enforces it), so the rule that
 * drafts never appear on a public page lives here: only published and closed
 * events are ever selected.
 */

const VISIBLE: EventStatus[] = ["PUBLISHED", "CLOSED"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cardSelect = {
  id: true,
  name: true,
  venue: true,
  theme: true,
  startsAt: true,
  endsAt: true,
  registrationLink: true,
  imageAsset: { select: { objectKey: true, storageBucket: true } },
  _count: { select: { sdeVideos: true } },
} satisfies Prisma.EventSelect;

type CardRow = Prisma.EventGetPayload<{ select: typeof cardSelect }>;

export type PublicEventCard = {
  id: string;
  name: string;
  venue: string | null;
  theme: string | null;
  startsAt: Date;
  endsAt: Date;
  registrationLink: string | null;
  coverUrl: string | null;
  hasSdeVideo: boolean;
};

function toCard(row: CardRow): PublicEventCard {
  return {
    id: row.id,
    name: row.name,
    venue: row.venue,
    theme: row.theme,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    registrationLink: row.registrationLink,
    coverUrl: publicImageUrl(row.imageAsset),
    hasSdeVideo: row._count.sdeVideos > 0,
  };
}

/** The soonest published event that has not ended yet (PS-02.2). */
export async function getNextEvent(now: Date): Promise<PublicEventCard | null> {
  const row = await getPrismaClient().event.findFirst({
    where: { status: "PUBLISHED", endsAt: { gt: now } },
    orderBy: { startsAt: "asc" },
    select: cardSelect,
  });
  return row ? toCard(row) : null;
}

/** Published events that have not ended, soonest first (PS-05.1, PS-05.6). */
export async function listUpcomingEvents(now: Date): Promise<PublicEventCard[]> {
  const rows = await getPrismaClient().event.findMany({
    where: { status: "PUBLISHED", endsAt: { gt: now } },
    orderBy: { startsAt: "asc" },
    select: cardSelect,
  });
  return rows.map(toCard);
}

/** Events whose end time has passed, newest first, one page at a time. */
export async function listPastEvents(
  now: Date,
  page: number,
  pageSize: number,
): Promise<{ events: PublicEventCard[]; total: number }> {
  const where = { status: { in: VISIBLE }, endsAt: { lte: now } } satisfies Prisma.EventWhereInput;
  const prisma = getPrismaClient();
  const [rows, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: cardSelect,
    }),
    prisma.event.count({ where }),
  ]);
  return { events: rows.map(toCard), total };
}

/** Events starting inside [start, end), for the month view (PS-04). */
export async function listEventsStartingBetween(start: Date, end: Date): Promise<PublicEventCard[]> {
  const rows = await getPrismaClient().event.findMany({
    where: { status: { in: VISIBLE }, startsAt: { gte: start, lt: end } },
    orderBy: { startsAt: "asc" },
    select: cardSelect,
  });
  return rows.map(toCard);
}

export type PublicSdeVideo = {
  id: string;
  title: string | null;
  caption: string | null;
  /** Set for a linked video. */
  link: VideoLink | null;
  /** Set for an uploaded video. */
  file: { url: string; mediaType: string } | null;
};

export type PublicPhoto = { id: string; url: string; altText: string; isCover: boolean };

export type PublicEventDetail = PublicEventCard & {
  details: string;
  isPast: boolean;
  sdeVideos: PublicSdeVideo[];
  photos: PublicPhoto[];
};

/**
 * One published or closed event. A draft, an unknown ID or a malformed ID all
 * read as "not found". SDE videos and photos belong to past events only
 * (PS-05.5, PS-14.6), so an upcoming event never returns them.
 */
export async function getPublicEvent(id: string, now: Date): Promise<PublicEventDetail | null> {
  if (!UUID.test(id)) return null;

  const row = await getPrismaClient().event.findFirst({
    where: { id, status: { in: VISIBLE } },
    select: {
      ...cardSelect,
      details: true,
      sdeVideos: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          caption: true,
          videoUrl: true,
          asset: { select: { objectKey: true, storageBucket: true, mediaType: true } },
        },
      },
      photos: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          altText: true,
          isCover: true,
          asset: { select: { objectKey: true, storageBucket: true } },
          webAsset: { select: { objectKey: true, storageBucket: true } },
        },
      },
    },
  });
  if (!row) return null;

  const isPast = row.endsAt.getTime() <= now.getTime();

  const sdeVideos: PublicSdeVideo[] = isPast
    ? row.sdeVideos.flatMap((video) => {
        const link = video.videoUrl ? describeVideoLink(video.videoUrl) : null;
        const fileUrl = video.asset ? publicImageUrl(video.asset) : null;
        if (!link && !fileUrl) return [];
        return [
          {
            id: video.id,
            title: video.title,
            caption: video.caption,
            link,
            file: fileUrl && video.asset ? { url: fileUrl, mediaType: video.asset.mediaType } : null,
          },
        ];
      })
    : [];

  const photos: PublicPhoto[] = isPast
    ? row.photos.flatMap((photo) => {
        const url = publicImageUrl(photo.webAsset ?? photo.asset);
        return url ? [{ id: photo.id, url, altText: photo.altText, isCover: photo.isCover }] : [];
      })
    : [];

  return { ...toCard(row), details: row.details, isPast, sdeVideos, photos };
}
