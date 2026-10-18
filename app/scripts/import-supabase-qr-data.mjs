import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Prisma } from "@prisma/client";

import { MAX_IMAGE_UPLOAD_SIZE_BYTES, validateUpload } from "../lib/storage/upload-validation.ts";
import {
  createPrismaClient,
  readQrExport,
  requireEnvironment,
  sourceLinksSql,
  sourceVisitsSql,
  targetVisitsSql,
} from "./lib/qr-export.mjs";

const LOGO_TIMEOUT_MS = 15_000;
const LOGO_BUCKET = "public-images";

export class LogoMigrationError extends Error {}

const LOGO_PATH_PREFIX = "/storage/v1/object/public/";

/**
 * Reads SUPABASE_STORAGE_ORIGIN (for example https://<project-ref>.supabase.co)
 * into the one origin logos may be downloaded from. Anything with a path,
 * query, or credentials is refused so the value cannot be read two ways.
 */
export function parseStorageOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("SUPABASE_STORAGE_ORIGIN is not a valid URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SUPABASE_STORAGE_ORIGIN must be an HTTPS origin such as https://<project-ref>.supabase.co.");
  }
  return url.origin;
}

/**
 * Downloads one legacy logo with a timeout, a size cap, and no redirects. The
 * legacy app let any signed-in user store any logo address, so only public
 * objects on the legacy project's own storage origin are fetched.
 */
export async function downloadLogo(address, storageOrigin, fetchImpl = fetch) {
  let url;
  try {
    url = new URL(address);
  } catch {
    throw new LogoMigrationError("The logo address is not a valid URL.");
  }
  if (url.protocol !== "https:") {
    throw new LogoMigrationError("The logo address is not HTTPS.");
  }
  // URL normalizes "..", so the prefix check cannot be walked out of.
  if (url.origin !== storageOrigin || url.username || url.password || !url.pathname.startsWith(LOGO_PATH_PREFIX)) {
    throw new LogoMigrationError("The logo address is not a public file in the legacy Supabase storage.");
  }

  let response;
  try {
    response = await fetchImpl(url, { redirect: "error", signal: AbortSignal.timeout(LOGO_TIMEOUT_MS) });
  } catch (error) {
    throw new LogoMigrationError(
      error?.name === "TimeoutError" ? "The logo download timed out." : "The logo could not be downloaded.",
    );
  }
  // redirect: "error" already rejects; this also covers a fetch that followed one anyway.
  if (response.redirected || (response.url && new URL(response.url).origin !== storageOrigin)) {
    throw new LogoMigrationError("The logo download was redirected.");
  }
  if (!response.ok) {
    throw new LogoMigrationError(`The logo download returned HTTP ${response.status}.`);
  }

  const mediaType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!mediaType.startsWith("image/")) {
    throw new LogoMigrationError("The logo address did not return an image.");
  }
  if (Number(response.headers.get("content-length")) > MAX_IMAGE_UPLOAD_SIZE_BYTES || !response.body) {
    throw new LogoMigrationError("The logo is larger than the upload limit or empty.");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
      throw new LogoMigrationError("The logo is larger than the upload limit or empty.");
    }
    chunks.push(chunk);
  }

  return { bytes: new Uint8Array(Buffer.concat(chunks)), mediaType };
}

function logoFilename(address) {
  try {
    const segment = new URL(address).pathname.split("/").filter(Boolean).at(-1);
    return segment ? decodeURIComponent(segment) : "qr-logo";
  } catch {
    return "qr-logo";
  }
}

async function migrateLogo({ address, adminId, prisma, storage, fetchLogo, created }) {
  const { bytes, mediaType } = await fetchLogo(address);
  // The same Sharp normalization as dashboard uploads: real PNG/JPEG/WebP only, stored as WebP.
  const validation = await validateUpload({ size: bytes.byteLength, type: mediaType }, bytes);
  if (!validation.valid || validation.mediaType !== "image/webp") {
    throw new LogoMigrationError(validation.error ?? "The logo is not a supported image.");
  }

  const upload = { assetId: null, objectKey: `assets/${randomUUID()}.webp` };
  await storage.send(
    new PutObjectCommand({
      Bucket: LOGO_BUCKET,
      Key: upload.objectKey,
      Body: validation.bytes,
      ContentLength: validation.bytes.byteLength,
      ContentType: validation.mediaType,
    }),
  );
  created.push(upload);

  const asset = await prisma.asset.create({
    data: {
      objectKey: upload.objectKey,
      storageBucket: "PUBLIC_IMAGES",
      originalFilename: logoFilename(address),
      mediaType: validation.mediaType,
      byteSize: validation.bytes.byteLength,
      uploadedById: adminId,
    },
    select: { id: true },
  });
  upload.assetId = asset.id;
  return asset.id;
}

/**
 * Undoes this run's logo uploads after `error` stopped the import and returns
 * the error to throw. Every uploaded file is attempted even if the asset rows
 * cannot be deleted, and `error` stays the primary failure: it is returned
 * as-is, or first in an AggregateError (and its cause) if the row delete failed.
 */
export async function removeUploadedLogos(prisma, storage, created, error) {
  const assetIds = created.map((upload) => upload.assetId).filter(Boolean);
  let rowError;
  if (assetIds.length > 0) {
    try {
      await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
    } catch (deleteError) {
      rowError = deleteError;
    }
  }

  for (const upload of created) {
    try {
      await storage.send(new DeleteObjectCommand({ Bucket: LOGO_BUCKET, Key: upload.objectKey }));
    } catch (deleteError) {
      console.error(`Could not remove uploaded logo ${upload.objectKey}; delete it manually.`, deleteError);
    }
  }

  if (rowError) {
    return new AggregateError(
      [error, rowError],
      `The import failed, and its logo asset rows could not be removed; delete them manually: ${assetIds.join(", ")}`,
      { cause: error },
    );
  }
  return error;
}

async function findCodeConflicts(prisma, links) {
  return prisma.$queryRaw(Prisma.sql`
    WITH source_links AS (${sourceLinksSql(links)})
    SELECT s."code" AS "sourceCode", s."id"::text AS "sourceId",
      t."code" AS "targetCode", t."id"::text AS "targetId"
    FROM source_links s
    JOIN "short_urls" t ON t."id" = s."id" OR t."code" = s."code"
    WHERE t."id" <> s."id" OR t."code" <> s."code"
  `);
}

/**
 * Inserts new links with their original ids, codes, counters, and timestamps,
 * then adds any source scans the target is missing. A link already present is
 * left as-is (ON CONFLICT (id) DO NOTHING) except that scans recorded by the
 * legacy resolver since the previous run are appended and counted, so a final
 * top-up after the redirect switch loses nothing and repeats nothing.
 *
 * It is one statement, so it commits or rolls back as a whole without an
 * interactive transaction deadline.
 */
function writeSql(links, visits, adminId) {
  return Prisma.sql`
    WITH source_links AS (${sourceLinksSql(links)}),
    source_visits AS (${sourceVisitsSql(visits)}),
    inserted_links AS (
      INSERT INTO "short_urls" (
        "id", "code", "name", "destination", "view_count", "status", "expires_at",
        "qr_logo_asset_id", "qr_foreground", "qr_background", "created_by_admin_id",
        "created_at", "updated_at"
      )
      SELECT "id", "code", "name", "destination", "viewCount", "status"::"ShortUrlStatus",
        "expiresAt", "qrLogoAssetId", "qrForeground", "qrBackground", ${adminId},
        "createdAt", "updatedAt"
      FROM source_links
      ON CONFLICT ("id") DO NOTHING
      RETURNING "id"
    ),
    target_visits AS (${targetVisitsSql}),
    missing_visits AS (
      SELECT s."linkId", s."visitedAt"
      FROM source_visits s
      LEFT JOIN target_visits t
        ON t."short_url_id" = s."linkId"
        AND t."visited_at" = s."visitedAt"
        AND t."occurrence" = s."occurrence"
      WHERE t."short_url_id" IS NULL
    ),
    inserted_visits AS (
      INSERT INTO "short_url_visits" ("short_url_id", "visited_at")
      SELECT "linkId", "visitedAt" FROM missing_visits
      RETURNING "short_url_id"
    ),
    topped_up_links AS (
      UPDATE "short_urls" t
      SET "view_count" = t."view_count" + m."added"
      FROM (
        SELECT "linkId", count(*) AS "added"
        FROM missing_visits
        WHERE "linkId" NOT IN (SELECT "id" FROM inserted_links)
        GROUP BY "linkId"
      ) m
      WHERE t."id" = m."linkId"
      RETURNING t."id"
    )
    SELECT
      (SELECT count(*) FROM inserted_links)::int AS "insertedLinks",
      (SELECT count(*) FROM inserted_visits)::int AS "insertedVisits",
      (SELECT count(*) FROM topped_up_links)::int AS "toppedUpLinks"
  `;
}

export async function importQrExport({
  prisma,
  storage,
  exportData,
  adminId,
  fetchLogo,
  dryRun = false,
}) {
  const admin = await prisma.admin.findUnique({ where: { neonAuthUserId: adminId }, select: { neonAuthUserId: true } });
  if (!admin) {
    throw new Error("QR_MIGRATION_ADMIN_ID does not match an administrator in this database.");
  }

  const conflicts = await findCodeConflicts(prisma, exportData.links);
  if (conflicts.length > 0) {
    const lines = conflicts.map(
      (row) => `  - source ${row.sourceCode} (${row.sourceId}) vs existing ${row.targetCode} (${row.targetId})`,
    );
    throw new Error(["Nothing was imported: these codes or ids already belong to different links.", ...lines].join("\n"));
  }

  const existing = await prisma.shortUrl.findMany({
    where: { id: { in: exportData.links.map((link) => link.id) } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((link) => link.id));
  const newLinks = exportData.links.filter((link) => !existingIds.has(link.id));
  const logoAddresses = [...new Set(newLinks.map((link) => link.qrLogoUrl).filter(Boolean))];

  const summary = {
    sourceLinks: exportData.links.length,
    sourceVisits: exportData.visits.length,
    alreadyPresentLinks: existingIds.size,
    logosToMigrate: logoAddresses.length,
  };
  if (dryRun) return { ...summary, dryRun: true, unmigratedLogos: [] };

  const logoAssetIds = new Map();
  const logoFailures = new Map();
  const created = [];

  for (const address of logoAddresses) {
    try {
      logoAssetIds.set(address, await migrateLogo({ address, adminId, prisma, storage, fetchLogo, created }));
    } catch (error) {
      if (!(error instanceof LogoMigrationError)) {
        throw await removeUploadedLogos(prisma, storage, created, error);
      }
      logoFailures.set(address, error.message);
    }
  }

  const links = exportData.links.map((link) => ({
    ...link,
    qrLogoAssetId: logoAssetIds.get(link.qrLogoUrl) ?? null,
  }));

  let result;
  try {
    [result] = await prisma.$queryRaw(writeSql(links, exportData.visits, adminId));
  } catch (error) {
    throw await removeUploadedLogos(prisma, storage, created, error);
  }

  const unmigratedLogos = newLinks
    .filter((link) => logoFailures.has(link.qrLogoUrl))
    .map((link) => ({
      linkId: link.id,
      code: link.code,
      sourceUrl: link.qrLogoUrl,
      reason: logoFailures.get(link.qrLogoUrl),
    }));

  return { ...summary, ...result, migratedLogos: logoAssetIds.size, unmigratedLogos };
}

function parseArguments(argv) {
  const options = { exportPath: undefined, dryRun: false, reportPath: "qr-unmigrated-logos.json" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--report") options.reportPath = argv[(index += 1)];
    else if (!argument.startsWith("--") && !options.exportPath) options.exportPath = argument;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.reportPath) throw new Error("--report needs a file path.");
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  requireEnvironment([
    "DATABASE_URL",
    "QR_MIGRATION_ADMIN_ID",
    ...(options.dryRun
      ? []
      : ["SUPABASE_STORAGE_ORIGIN", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_ENDPOINT_URL_S3", "AWS_REGION"]),
  ]);
  const storageOrigin = options.dryRun ? undefined : parseStorageOrigin(process.env.SUPABASE_STORAGE_ORIGIN);

  const exportData = await readQrExport(options.exportPath);
  const prisma = createPrismaClient();
  const storage = options.dryRun
    ? undefined
    : new S3Client({
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        endpoint: process.env.AWS_ENDPOINT_URL_S3,
        forcePathStyle: true,
        region: process.env.AWS_REGION,
      });

  try {
    const report = await importQrExport({
      prisma,
      storage,
      exportData,
      adminId: process.env.QR_MIGRATION_ADMIN_ID,
      fetchLogo: (address) => downloadLogo(address, storageOrigin),
      dryRun: options.dryRun,
    });
    const { unmigratedLogos, ...counts } = report;

    console.log(options.dryRun ? "Dry run: nothing was written." : "Import complete.");
    console.table(counts);

    if (!options.dryRun) {
      await writeFile(options.reportPath, `${JSON.stringify(unmigratedLogos, null, 2)}\n`);
      console.log(
        unmigratedLogos.length > 0
          ? `${unmigratedLogos.length} link(s) were imported without their logo; see ${options.reportPath}.`
          : `Every logo was migrated; ${options.reportPath} is empty.`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.main) {
  await main();
}
