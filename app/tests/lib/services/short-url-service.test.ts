import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { getPrismaClient, prisma } = vi.hoisted(() => {
  const prisma = {
    asset: { findFirst: vi.fn() },
    shortUrl: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };

  return { getPrismaClient: vi.fn(() => prisma), prisma };
});

vi.mock("@/lib/prisma", () => ({ getPrismaClient }));

import {
  createShortUrl,
  deleteShortUrl,
  getShortUrlStatus,
  listShortUrls,
  resolveShortUrl,
  setShortUrlStatus,
  ShortUrlInputError,
  updateShortUrl,
} from "@/lib/services/short-url-service";

const activeLink = {
  id: "9fdcd48a-170a-4af7-862e-a511ad9d7b94",
  code: "AbCdEfG",
  name: "SIC handbook",
  destination: "https://example.com/handbook",
  viewCount: 12n,
  status: "ACTIVE" as const,
  expiresAt: null,
  qrForeground: "#12333A",
  qrBackground: "#FFFFFF",
  qrLogoAssetId: null,
  qrLogoAsset: null,
  createdAt: new Date("2026-10-15T08:00:00.000Z"),
  updatedAt: new Date("2026-10-15T08:30:00.000Z"),
};

beforeEach(() => {
  process.env.AWS_ENDPOINT_URL_S3 = "https://storage.example.com";
  prisma.asset.findFirst.mockResolvedValue({ id: "asset-id" });
  prisma.shortUrl.create.mockResolvedValue(activeLink);
  prisma.shortUrl.findMany.mockResolvedValue([activeLink]);
  prisma.shortUrl.findFirst.mockResolvedValue(activeLink);
  prisma.shortUrl.updateMany.mockResolvedValue({ count: 1 });
  prisma.shortUrl.deleteMany.mockResolvedValue({ count: 1 });
  prisma.$queryRaw.mockResolvedValue([{ destination: activeLink.destination }]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  delete process.env.AWS_ENDPOINT_URL_S3;
});

describe("createShortUrl", () => {
  test("normalizes operator input and returns JSON-safe link data", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T09:00:00.000Z"));

    const result = await createShortUrl(
      {
        name: "  SIC handbook  ",
        destination: "  https://example.com/handbook  ",
        expiresAt: "2026-10-16T09:00:00.000Z",
        qrForeground: "#12333a",
        qrBackground: "#ffffff",
      },
      "admin-id",
    );

    expect(prisma.shortUrl.create).toHaveBeenCalledWith({
      data: {
        code: expect.stringMatching(/^[A-Za-z]{7}$/),
        createdById: "admin-id",
        destination: "https://example.com/handbook",
        expiresAt: new Date("2026-10-16T09:00:00.000Z"),
        name: "SIC handbook",
        qrBackground: "#FFFFFF",
        qrForeground: "#12333A",
        qrLogoAssetId: null,
      },
      include: {
        qrLogoAsset: { select: { objectKey: true, storageBucket: true } },
      },
    });
    expect(result).toMatchObject({
      code: "AbCdEfG",
      viewCount: 12,
      createdAt: "2026-10-15T08:00:00.000Z",
      qrLogoUrl: null,
    });
  });

  test("uses the default name when the supplied name is blank", async () => {
    await createShortUrl({ name: "   ", destination: activeLink.destination }, "admin-id");

    expect(prisma.shortUrl.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Untitled link" }) }),
    );
  });

  test.each([
    ["http://example.com", "secure HTTPS"],
    ["not a URL", "secure HTTPS"],
    ["https://example.com/bad path", "secure HTTPS"],
  ])("rejects malformed destination %s", async (destination, message) => {
    await expect(createShortUrl({ destination }, "admin-id")).rejects.toThrow(message);
    expect(prisma.shortUrl.create).not.toHaveBeenCalled();
  });

  test.each(["#fff", "12333A", "#GGGGGG"])("rejects invalid QR color %s", async (color) => {
    await expect(
      createShortUrl({ destination: activeLink.destination, qrForeground: color }, "admin-id"),
    ).rejects.toThrow("six-digit hex color");
  });

  test("rejects an invalid or non-future expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T09:00:00.000Z"));

    await expect(
      createShortUrl({ destination: activeLink.destination, expiresAt: "not-a-date" }, "admin-id"),
    ).rejects.toThrow("valid future date");
    await expect(
      createShortUrl(
        { destination: activeLink.destination, expiresAt: "2026-10-15T09:00:00.000Z" },
        "admin-id",
      ),
    ).rejects.toThrow("valid future date");
  });

  test("accepts only an existing public-image asset as a logo", async () => {
    prisma.asset.findFirst.mockResolvedValueOnce(null);

    await expect(
      createShortUrl(
        { destination: activeLink.destination, qrLogoAssetId: "asset-id" },
        "admin-id",
      ),
    ).rejects.toThrow("public uploaded image");
    expect(prisma.asset.findFirst).toHaveBeenCalledWith({
      where: { id: "asset-id", storageBucket: "PUBLIC_IMAGES" },
      select: { id: true },
    });
  });

  test("retries a bounded code collision", async () => {
    prisma.shortUrl.create
      .mockRejectedValueOnce({ code: "P2002" })
      .mockResolvedValueOnce(activeLink);

    await expect(
      createShortUrl({ destination: activeLink.destination }, "admin-id"),
    ).resolves.toMatchObject({ id: activeLink.id });
    expect(prisma.shortUrl.create).toHaveBeenCalledTimes(2);
  });

  test("stops retrying after repeated collisions", async () => {
    prisma.shortUrl.create.mockRejectedValue({ code: "P2002" });

    await expect(
      createShortUrl({ destination: activeLink.destination }, "admin-id"),
    ).rejects.toThrow("unique short code");
    expect(prisma.shortUrl.create).toHaveBeenCalledTimes(5);
  });
});

test("listShortUrls scopes the query to its administrator", async () => {
  await expect(listShortUrls("admin-id")).resolves.toEqual([
    expect.objectContaining({ id: activeLink.id, viewCount: 12 }),
  ]);
  expect(prisma.shortUrl.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { createdById: "admin-id" } }),
  );
});

test("updates only a link owned by the administrator", async () => {
  await updateShortUrl(
    activeLink.id,
    { name: "Updated", destination: "https://example.com/new" },
    "admin-id",
  );

  expect(prisma.shortUrl.updateMany).toHaveBeenCalledWith({
    where: { id: activeLink.id, createdById: "admin-id" },
    data: expect.objectContaining({ name: "Updated", destination: "https://example.com/new" }),
  });
});

test("returns null when an administrator cannot change another owner's link", async () => {
  prisma.shortUrl.updateMany.mockResolvedValueOnce({ count: 0 });

  await expect(
    setShortUrlStatus(activeLink.id, "DISABLED", "other-admin"),
  ).resolves.toBeNull();
  expect(prisma.shortUrl.findFirst).not.toHaveBeenCalled();
});

test("deletes only a link owned by the administrator", async () => {
  await expect(deleteShortUrl(activeLink.id, "admin-id")).resolves.toBe(true);
  expect(prisma.shortUrl.deleteMany).toHaveBeenCalledWith({
    where: { id: activeLink.id, createdById: "admin-id" },
  });
});

test("classifies active, disabled, and expired links", () => {
  const now = new Date("2026-10-15T09:00:00.000Z");

  expect(getShortUrlStatus({ status: "ACTIVE", expiresAt: null }, now)).toBe("active");
  expect(getShortUrlStatus({ status: "DISABLED", expiresAt: null }, now)).toBe("disabled");
  expect(
    getShortUrlStatus({ status: "ACTIVE", expiresAt: new Date("2026-10-15T08:59:59.000Z") }, now),
  ).toBe("expired");
});

test("resolves through the atomic database contract", async () => {
  await expect(resolveShortUrl("AbCdEfG")).resolves.toBe(activeLink.destination);
  expect(prisma.$queryRaw).toHaveBeenCalledOnce();
});

test("does not return a destination when no active unexpired link resolves", async () => {
  prisma.$queryRaw.mockResolvedValueOnce([]);

  await expect(resolveShortUrl("AbCdEfG")).resolves.toBeNull();
});

test("rejects malformed codes before querying", async () => {
  await expect(resolveShortUrl("abc1234")).rejects.toBeInstanceOf(ShortUrlInputError);
  expect(prisma.$queryRaw).not.toHaveBeenCalled();
});
