import "server-only";

import { randomBytes } from "node:crypto";

import { Prisma, type ShortUrlStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { publicImageUrl } from "@/lib/services/event-service";

const CODE_PATTERN = /^[A-Za-z]{7}$/;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const CODE_RETRY_LIMIT = 5;

export class ShortUrlInputError extends Error {}

export type ShortUrlInput = {
  name?: string;
  destination: string;
  expiresAt?: string | null;
  qrForeground?: string;
  qrBackground?: string;
  qrLogoAssetId?: string | null;
};

export type ShortUrlUpdateInput = Partial<ShortUrlInput>;

export type ShortUrlView = {
  id: string;
  code: string;
  name: string;
  destination: string;
  viewCount: number;
  status: ShortUrlStatus;
  expiresAt: string | null;
  qrForeground: string;
  qrBackground: string;
  qrLogoAssetId: string | null;
  qrLogoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type ShortUrlRecord = {
  id: string;
  code: string;
  name: string;
  destination: string;
  viewCount: bigint;
  status: ShortUrlStatus;
  expiresAt: Date | null;
  qrForeground: string;
  qrBackground: string;
  qrLogoAssetId: string | null;
  qrLogoAsset: { objectKey: string; storageBucket: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
};

const logoInclude = {
  qrLogoAsset: { select: { objectKey: true, storageBucket: true } },
} as const;

function serializeShortUrl(link: ShortUrlRecord): ShortUrlView {
  const viewCount = Number(link.viewCount);
  if (!Number.isSafeInteger(viewCount)) {
    throw new Error("The scan count is too large to display safely.");
  }

  return {
    id: link.id,
    code: link.code,
    name: link.name,
    destination: link.destination,
    viewCount,
    status: link.status,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    qrForeground: link.qrForeground,
    qrBackground: link.qrBackground,
    qrLogoAssetId: link.qrLogoAssetId,
    qrLogoUrl: publicImageUrl(link.qrLogoAsset),
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

function normalizeName(name: string | undefined): string {
  return name?.trim() || "Untitled link";
}

function normalizeDestination(destination: unknown): string {
  if (typeof destination !== "string") {
    throw new ShortUrlInputError("Destination link must be a secure HTTPS address.");
  }

  const trimmed = destination.trim();
  if (/\s/.test(trimmed)) {
    throw new ShortUrlInputError("Destination link must be a secure HTTPS address.");
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || !url.hostname) throw new Error("Invalid protocol");
    return url.toString();
  } catch {
    throw new ShortUrlInputError("Destination link must be a secure HTTPS address.");
  }
}

function normalizeColor(color: unknown, field: string): string {
  if (typeof color !== "string" || !COLOR_PATTERN.test(color)) {
    throw new ShortUrlInputError(`${field} must be a six-digit hex color.`);
  }

  return color.toUpperCase();
}

function normalizeExpiry(expiresAt: unknown, now = new Date()): Date | null {
  if (expiresAt === null || expiresAt === undefined || expiresAt === "") return null;
  if (typeof expiresAt !== "string") {
    throw new ShortUrlInputError("Expiry must be a valid future date.");
  }

  const parsed = new Date(expiresAt);
  if (!Number.isFinite(parsed.getTime()) || parsed <= now) {
    throw new ShortUrlInputError("Expiry must be a valid future date.");
  }

  return parsed;
}

async function validateLogo(qrLogoAssetId: string | null | undefined): Promise<void> {
  if (!qrLogoAssetId) return;

  const asset = await getPrismaClient().asset.findFirst({
    where: { id: qrLogoAssetId, storageBucket: "PUBLIC_IMAGES" },
    select: { id: true },
  });

  if (!asset) {
    throw new ShortUrlInputError("QR logo must be a public uploaded image.");
  }
}

function randomCode(): string {
  const bytes = randomBytes(7);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

function isUniqueConflict(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

function createData(input: ShortUrlInput) {
  return {
    name: normalizeName(input.name),
    destination: normalizeDestination(input.destination),
    expiresAt: normalizeExpiry(input.expiresAt),
    qrForeground: normalizeColor(input.qrForeground ?? "#12333A", "Foreground color"),
    qrBackground: normalizeColor(input.qrBackground ?? "#FFFFFF", "Background color"),
    qrLogoAssetId: input.qrLogoAssetId || null,
  };
}

function updateData(input: ShortUrlUpdateInput) {
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) data.name = normalizeName(input.name);
  if (input.destination !== undefined) data.destination = normalizeDestination(input.destination);
  if (input.expiresAt !== undefined) data.expiresAt = normalizeExpiry(input.expiresAt);
  if (input.qrForeground !== undefined) {
    data.qrForeground = normalizeColor(input.qrForeground, "Foreground color");
  }
  if (input.qrBackground !== undefined) {
    data.qrBackground = normalizeColor(input.qrBackground, "Background color");
  }
  if (input.qrLogoAssetId !== undefined) data.qrLogoAssetId = input.qrLogoAssetId || null;

  if (Object.keys(data).length === 0) {
    throw new ShortUrlInputError("Choose at least one link setting to update.");
  }

  return data;
}

export async function createShortUrl(
  input: ShortUrlInput,
  adminId: string,
): Promise<ShortUrlView> {
  const data = createData(input);
  await validateLogo(data.qrLogoAssetId);

  for (let attempt = 0; attempt < CODE_RETRY_LIMIT; attempt += 1) {
    try {
      const link = await getPrismaClient().shortUrl.create({
        data: { ...data, code: randomCode(), createdById: adminId },
        include: logoInclude,
      });
      return serializeShortUrl(link);
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
    }
  }

  throw new Error("Unable to generate a unique short code. Please try again.");
}

export async function listShortUrls(adminId: string): Promise<ShortUrlView[]> {
  const links = await getPrismaClient().shortUrl.findMany({
    where: { createdById: adminId },
    include: logoInclude,
    orderBy: { createdAt: "desc" },
  });

  return links.map(serializeShortUrl);
}

async function findOwnedShortUrl(id: string, adminId: string): Promise<ShortUrlView | null> {
  const link = await getPrismaClient().shortUrl.findFirst({
    where: { id, createdById: adminId },
    include: logoInclude,
  });
  return link ? serializeShortUrl(link) : null;
}

export async function updateShortUrl(
  id: string,
  input: ShortUrlUpdateInput,
  adminId: string,
): Promise<ShortUrlView | null> {
  const data = updateData(input);
  if ("qrLogoAssetId" in data) await validateLogo(data.qrLogoAssetId as string | null);

  const result = await getPrismaClient().shortUrl.updateMany({
    where: { id, createdById: adminId },
    data,
  });
  if (result.count !== 1) return null;

  return findOwnedShortUrl(id, adminId);
}

export async function setShortUrlStatus(
  id: string,
  status: ShortUrlStatus,
  adminId: string,
): Promise<ShortUrlView | null> {
  if (status !== "ACTIVE" && status !== "DISABLED") {
    throw new ShortUrlInputError("Link status must be active or paused.");
  }

  const result = await getPrismaClient().shortUrl.updateMany({
    where: { id, createdById: adminId },
    data: { status },
  });
  if (result.count !== 1) return null;

  return findOwnedShortUrl(id, adminId);
}

export async function deleteShortUrl(id: string, adminId: string): Promise<boolean> {
  const result = await getPrismaClient().shortUrl.deleteMany({
    where: { id, createdById: adminId },
  });
  return result.count === 1;
}

export function getShortUrlStatus(
  link: { status: ShortUrlStatus; expiresAt: Date | null },
  now = new Date(),
): "active" | "disabled" | "expired" {
  if (link.status === "DISABLED") return "disabled";
  if (link.expiresAt && link.expiresAt <= now) return "expired";
  return "active";
}

export async function resolveShortUrl(code: string): Promise<string | null> {
  if (!CODE_PATTERN.test(code)) {
    throw new ShortUrlInputError("Short code must contain exactly seven letters.");
  }

  const rows = await getPrismaClient().$queryRaw<Array<{ destination: string }>>(Prisma.sql`
    WITH resolved AS (
      UPDATE "short_urls"
      SET "view_count" = "view_count" + 1
      WHERE "code" = ${code}
        AND "status" = 'active'::"ShortUrlStatus"
        AND ("expires_at" IS NULL OR "expires_at" > now())
      RETURNING "id", "destination"
    ), tracked AS (
      INSERT INTO "short_url_visits" ("short_url_id")
      SELECT "id" FROM resolved
    )
    SELECT "destination" FROM resolved
  `);

  return rows[0]?.destination ?? null;
}
