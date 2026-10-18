import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { expect, test, vi } from "vitest";

import { importQrExport, LogoMigrationError } from "@/scripts/import-supabase-qr-data.mjs";
import { verifyQrImport } from "@/scripts/verify-qr-import.mjs";
import { getTestDatabase, hasTestDatabase, seedTestDatabase } from "@/tests/setup";

const adminId = "admin-qr-import-test";
const activeId = "4a5c4b1e-8a3e-4f43-9a51-1f5f2f0a6b10";
const pausedId = "4a5c4b1e-8a3e-4f43-9a51-1f5f2f0a6b11";
const logoUrl = "https://project.supabase.co/storage/v1/object/public/qr-logos/owner/logo.png";

type ExportLink = {
  id: string;
  code: string;
  name: string;
  destination: string;
  viewCount: string;
  status: "active" | "disabled";
  expiresAt: string | null;
  qrForeground: string;
  qrBackground: string;
  qrLogoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
type ExportData = {
  exportedAt: string;
  links: ExportLink[];
  visits: Array<{ linkId: string; visitedAt: string }>;
};

function exportData(): ExportData {
  return {
    exportedAt: "2026-10-15T00:00:00.000000Z",
    links: [
      {
        id: activeId,
        code: "AbCdEfG",
        name: "Orientation",
        destination: "https://example.test/orientation?ref=qr",
        viewCount: "3",
        status: "active",
        expiresAt: "2027-01-01T00:00:00.000000Z",
        qrForeground: "#176b4f",
        qrBackground: "#f9f9ee",
        qrLogoUrl: logoUrl,
        createdAt: "2026-09-02T01:02:03.123456Z",
        updatedAt: "2026-09-03T01:02:03.654321Z",
      },
      {
        id: pausedId,
        code: "aBcDeFg",
        name: "Old poster",
        destination: "https://example.test/poster",
        viewCount: "0",
        status: "disabled",
        expiresAt: "2026-09-10T00:00:00.000000Z",
        qrForeground: "#000000",
        qrBackground: "#FFFFFF",
        qrLogoUrl: null,
        createdAt: "2026-09-01T00:00:00.000000Z",
        updatedAt: "2026-09-01T00:00:00.000000Z",
      },
    ],
    visits: [
      { linkId: activeId, visitedAt: "2026-09-04T00:00:00.000001Z" },
      { linkId: activeId, visitedAt: "2026-09-04T00:00:00.000001Z" },
      { linkId: activeId, visitedAt: "2026-09-05T08:30:00.500000Z" },
    ],
  };
}

async function pngLogo(): Promise<Uint8Array<ArrayBuffer>> {
  return Uint8Array.from(
    await sharp({ create: { width: 8, height: 8, channels: 3, background: "#12333a" } }).png().toBuffer(),
  );
}

async function setup() {
  await seedTestDatabase((database) => database.admin.create({ data: { neonAuthUserId: adminId } }));
  const storage = { send: vi.fn<(command: unknown) => Promise<object>>(async () => ({})) };
  const logo = await pngLogo();
  const fetchLogo = vi.fn(async () => ({ bytes: logo, mediaType: "image/png" }));
  return { prisma: getTestDatabase(), storage, fetchLogo, adminId };
}

test.skipIf(!hasTestDatabase())("imports links, scans, and logos exactly and verifies them", async () => {
  const context = await setup();
  const report = await importQrExport({ ...context, exportData: exportData() });

  expect(report).toMatchObject({ insertedLinks: 2, insertedVisits: 3, toppedUpLinks: 0, migratedLogos: 1 });
  expect(report.unmigratedLogos).toEqual([]);

  const rows = await context.prisma.$queryRaw<
    Array<{ code: string; view_count: bigint; status: string; created_at: string; logo_bucket: string | null }>
  >`
    SELECT s."code", s."view_count", s."status"::text,
      to_char(s."created_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "created_at",
      a."storage_bucket"::text AS "logo_bucket"
    FROM "short_urls" s LEFT JOIN "assets" a ON a."id" = s."qr_logo_asset_id"
    ORDER BY s."code"
  `;
  expect(rows).toEqual([
    { code: "AbCdEfG", view_count: BigInt(3), status: "active", created_at: "2026-09-02T01:02:03.123456Z", logo_bucket: "public-images" },
    { code: "aBcDeFg", view_count: BigInt(0), status: "disabled", created_at: "2026-09-01T00:00:00.000000Z", logo_bucket: null },
  ]);
  const upload = context.storage.send.mock.calls[0][0] as PutObjectCommand;
  expect(upload.input).toMatchObject({ Bucket: "public-images", ContentType: "image/webp" });

  await expect(verifyQrImport({ prisma: context.prisma, exportData: exportData() })).resolves.toMatchObject({
    ok: true,
    mismatchedLinks: [],
    missingLogos: [],
    missingVisits: 0,
  });
});

test.skipIf(!hasTestDatabase())("re-running is idempotent and appends only scans recorded since", async () => {
  const context = await setup();
  await importQrExport({ ...context, exportData: exportData() });

  await expect(importQrExport({ ...context, exportData: exportData() })).resolves.toMatchObject({
    alreadyPresentLinks: 2,
    insertedLinks: 0,
    insertedVisits: 0,
    logosToMigrate: 0,
  });

  // A scan through the new resolver, then a final export with one more legacy scan.
  await context.prisma.$executeRaw`
    WITH bumped AS (UPDATE "short_urls" SET "view_count" = "view_count" + 1 WHERE "id" = ${activeId}::uuid RETURNING "id")
    INSERT INTO "short_url_visits" ("short_url_id") SELECT "id" FROM bumped
  `;
  const later = exportData();
  later.links[0].viewCount = "4";
  later.visits.push({ linkId: activeId, visitedAt: "2026-10-14T23:59:59.999999Z" });

  await expect(importQrExport({ ...context, exportData: later })).resolves.toMatchObject({
    insertedLinks: 0,
    insertedVisits: 1,
    toppedUpLinks: 1,
  });
  const link = await context.prisma.shortUrl.findUniqueOrThrow({ where: { id: activeId } });
  expect(link.viewCount).toBe(BigInt(5));
  expect(context.fetchLogo).toHaveBeenCalledTimes(1);

  await expect(verifyQrImport({ prisma: context.prisma, exportData: later })).resolves.toMatchObject({ ok: false });
  await expect(
    verifyQrImport({ prisma: context.prisma, exportData: later, afterCutover: true }),
  ).resolves.toMatchObject({ ok: true });
});

test.skipIf(!hasTestDatabase())("refuses a code held by a different link before writing anything", async () => {
  const context = await setup();
  await context.prisma.shortUrl.create({
    data: { code: "AbCdEfG", destination: "https://example.test/new", createdById: adminId },
  });

  await expect(importQrExport({ ...context, exportData: exportData() })).rejects.toThrow(
    "these codes or ids already belong to different links",
  );
  expect(await context.prisma.shortUrl.count()).toBe(1);
  expect(context.fetchLogo).not.toHaveBeenCalled();
});

test.skipIf(!hasTestDatabase())("reports an unretrievable logo and imports the link without it", async () => {
  const context = await setup();
  context.fetchLogo.mockRejectedValueOnce(new LogoMigrationError("The logo download returned HTTP 404."));

  const report = await importQrExport({ ...context, exportData: exportData() });

  expect(report.unmigratedLogos).toEqual([
    { linkId: activeId, code: "AbCdEfG", sourceUrl: logoUrl, reason: "The logo download returned HTTP 404." },
  ]);
  expect(await context.prisma.asset.count()).toBe(0);
  await expect(verifyQrImport({ prisma: context.prisma, exportData: exportData() })).resolves.toMatchObject({
    ok: false,
    missingLogos: ["AbCdEfG"],
  });
  await expect(
    verifyQrImport({ prisma: context.prisma, exportData: exportData(), allowUnmigratedLogos: true }),
  ).resolves.toMatchObject({ ok: true });
});

test.skipIf(!hasTestDatabase())("removes uploaded logos when the link write fails", async () => {
  const context = await setup();
  const data = exportData();
  // The file parser would reject this; here it forces the single write statement to fail after the logo upload.
  data.links[1].code = data.links[0].code;

  await expect(importQrExport({ ...context, exportData: data })).rejects.toThrow();
  expect(await context.prisma.shortUrl.count()).toBe(0);
  expect(await context.prisma.asset.count()).toBe(0);
  expect(context.storage.send).toHaveBeenCalledTimes(2);
});

test.skipIf(!hasTestDatabase())("dry run checks the target and writes nothing", async () => {
  const context = await setup();

  await expect(importQrExport({ ...context, exportData: exportData(), dryRun: true })).resolves.toMatchObject({
    dryRun: true,
    sourceLinks: 2,
    alreadyPresentLinks: 0,
    logosToMigrate: 1,
  });
  expect(await context.prisma.shortUrl.count()).toBe(0);
  expect(context.fetchLogo).not.toHaveBeenCalled();

  await expect(
    importQrExport({ ...context, adminId: "someone-else", exportData: exportData(), dryRun: true }),
  ).rejects.toThrow("QR_MIGRATION_ADMIN_ID does not match an administrator");
});

test.skipIf(!hasTestDatabase())("flags a link whose settings differ from the source", async () => {
  const context = await setup();
  await importQrExport({ ...context, exportData: exportData() });
  await context.prisma.shortUrl.update({
    where: { id: pausedId },
    data: { destination: "https://example.test/changed", status: "ACTIVE" },
  });

  await expect(verifyQrImport({ prisma: context.prisma, exportData: exportData() })).resolves.toMatchObject({
    ok: false,
    mismatchedLinks: [{ code: "aBcDeFg", fields: ["destination", "status"] }],
  });
});
