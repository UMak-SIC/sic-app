import "server-only";

import type { ResourceType } from "@prisma/client";

import { compileMarkdown } from "@/lib/email/markdown-compiler";
import { getPrismaClient } from "@/lib/prisma";
import { publicImageUrl } from "@/lib/services/event-service";

/**
 * Site content reads for the public pages (PS-02, PS-03, PS-06 to PS-11, PS-13,
 * PS-15). Like events.ts, this is the only way public pages read the database,
 * so drafts (unpublished news) are filtered here and nowhere else.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SocialLink = { label: string; url: string };

export type SiteContent = {
  homeStatement: string | null;
  mission: string | null;
  vision: string | null;
  history: string | null;
  adviser: { name: string; title: string | null; photoUrl: string | null } | null;
  joinSteps: string[];
  membershipFormLocation: string | null;
  contactEmail: string | null;
  location: string | null;
  socialLinks: SocialLink[];
  privacyNoticeHtml: string | null;
  privacyNoticeUpdatedAt: Date | null;
};

const EMPTY_SITE_CONTENT: SiteContent = {
  homeStatement: null,
  mission: null,
  vision: null,
  history: null,
  adviser: null,
  joinSteps: [],
  membershipFormLocation: null,
  contactEmail: null,
  location: null,
  socialLinks: [],
  privacyNoticeHtml: null,
  privacyNoticeUpdatedAt: null,
};

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
}

function socialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { label, url } = item as Record<string, unknown>;
    if (typeof label !== "string" || typeof url !== "string" || !url.startsWith("https://")) return [];
    return [{ label, url }];
  });
}

/**
 * Markdown from the dashboard, sanitized the same way as invitations (SY-08.7).
 * Images must come from our own file storage; when it is not configured, a host
 * that matches nothing drops them instead of failing the page.
 */
export function renderMarkdown(markdown: string): string {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim();
  let allowedImageHost = "images.invalid";
  if (endpoint) {
    try {
      allowedImageHost = new URL(endpoint).host;
    } catch {
      // Keep the host that matches nothing.
    }
  }
  return compileMarkdown(markdown, { allowedImageHost });
}

export async function getSiteContent(): Promise<SiteContent> {
  const row = await getPrismaClient().siteContent.findUnique({
    where: { singleton: true },
    include: { adviserPhotoAsset: { select: { objectKey: true, storageBucket: true } } },
  });
  if (!row) return EMPTY_SITE_CONTENT;

  return {
    homeStatement: row.homeStatement,
    mission: row.mission,
    vision: row.vision,
    history: row.history,
    adviser: row.adviserName
      ? {
          name: row.adviserName,
          title: row.adviserTitle,
          photoUrl: publicImageUrl(row.adviserPhotoAsset),
        }
      : null,
    joinSteps: stringList(row.joinSteps),
    membershipFormLocation: row.membershipFormLocation,
    contactEmail: row.contactEmail,
    location: row.location,
    socialLinks: socialLinks(row.socialLinks),
    privacyNoticeHtml: row.privacyNoticeMarkdown ? renderMarkdown(row.privacyNoticeMarkdown) : null,
    privacyNoticeUpdatedAt: row.privacyNoticeUpdatedAt,
  };
}

export type PersonCard = { id: string; name: string; role: string; photoUrl: string | null };

export async function listOfficers(): Promise<PersonCard[]> {
  const rows = await getPrismaClient().officer.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { photoAsset: { select: { objectKey: true, storageBucket: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.position,
    photoUrl: publicImageUrl(row.photoAsset),
  }));
}

export type CommitteeWithMembers = {
  id: string;
  name: string;
  description: string | null;
  members: PersonCard[];
};

export async function listCommittees(): Promise<CommitteeWithMembers[]> {
  const rows = await getPrismaClient().committee.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      members: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { photoAsset: { select: { objectKey: true, storageBucket: true } } },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    members: row.members.map((member) => ({
      id: member.id,
      name: member.fullName,
      role: member.role,
      photoUrl: publicImageUrl(member.photoAsset),
    })),
  }));
}

export type Achievement = { id: string; title: string; year: number; description: string };

export async function listAchievements(): Promise<Achievement[]> {
  return getPrismaClient().achievement.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, year: true, description: true },
  });
}

export type NewsSummary = { id: string; title: string; postDate: Date; coverUrl: string | null };

/** Published posts only, newest first (PS-06.1). */
export async function listPublishedNews(
  page: number,
  pageSize: number,
): Promise<{ posts: NewsSummary[]; total: number }> {
  const prisma = getPrismaClient();
  const where = { status: "PUBLISHED" } as const;
  const [rows, total] = await Promise.all([
    prisma.newsPost.findMany({
      where,
      orderBy: [{ postDate: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { coverAsset: { select: { objectKey: true, storageBucket: true } } },
    }),
    prisma.newsPost.count({ where }),
  ]);
  return {
    posts: rows.map((row) => ({
      id: row.id,
      title: row.title,
      postDate: row.postDate,
      coverUrl: publicImageUrl(row.coverAsset),
    })),
    total,
  };
}

export type NewsPost = NewsSummary & { bodyHtml: string };

export async function getPublishedNewsPost(id: string): Promise<NewsPost | null> {
  if (!UUID.test(id)) return null;
  const row = await getPrismaClient().newsPost.findFirst({
    where: { id, status: "PUBLISHED" },
    include: { coverAsset: { select: { objectKey: true, storageBucket: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    postDate: row.postDate,
    coverUrl: publicImageUrl(row.coverAsset),
    bodyHtml: renderMarkdown(row.bodyMarkdown),
  };
}

export type Sponsor = { id: string; name: string; logoUrl: string | null; linkUrl: string | null };

export async function listSponsors(): Promise<Sponsor[]> {
  const rows = await getPrismaClient().sponsor.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { logoAsset: { select: { objectKey: true, storageBucket: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    logoUrl: publicImageUrl(row.logoAsset),
    linkUrl: row.linkUrl,
  }));
}

export type ResourceFile = {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  /** Null when the file is not stored where the public can download it (PS-09.4). */
  url: string | null;
};

const RESOURCE_ORDER: ResourceType[] = ["FORM", "BYLAW", "REPORT"];

function fileTypeLabel(mediaType: string, fileName: string): string {
  if (mediaType === "application/pdf") return "PDF";
  if (mediaType.startsWith("image/")) return mediaType.slice(6).toUpperCase();
  const extension = /\.([a-z0-9]+)$/i.exec(fileName)?.[1];
  return extension ? extension.toUpperCase() : "File";
}

export async function listResourcesByType(): Promise<{ type: ResourceType; files: ResourceFile[] }[]> {
  const rows = await getPrismaClient().resource.findMany({
    orderBy: [{ type: "asc" }, { title: "asc" }],
    include: {
      fileAsset: {
        select: { objectKey: true, storageBucket: true, originalFilename: true, mediaType: true },
      },
    },
  });
  return RESOURCE_ORDER.map((type) => ({
    type,
    files: rows
      .filter((row) => row.type === type)
      .map((row) => ({
        id: row.id,
        title: row.title,
        fileName: row.fileAsset.originalFilename,
        fileType: fileTypeLabel(row.fileAsset.mediaType, row.fileAsset.originalFilename),
        url: publicImageUrl(row.fileAsset),
      })),
  }));
}

export type Faq = { id: string; question: string; answerHtml: string };

/** One shared list for Home and Join Us (PS-13.2). Home shows featured ones only. */
export async function listFaqs({ featuredOnly }: { featuredOnly: boolean }): Promise<Faq[]> {
  const rows = await getPrismaClient().faq.findMany({
    where: featuredOnly ? { isFeatured: true } : {},
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: featuredOnly ? 5 : undefined,
  });
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answerHtml: renderMarkdown(row.answer),
  }));
}
