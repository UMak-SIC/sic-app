import { Prisma } from "@prisma/client";

import {
  createPrismaClient,
  readQrExport,
  requireEnvironment,
  sourceLinksSql,
  sourceVisitsSql,
  targetVisitsSql,
} from "./lib/qr-export.mjs";

/**
 * Per-link field comparison. Before cutover every counter must match exactly;
 * after the redirect switch the target may have more scans than the source,
 * but never fewer.
 */
function linkDifferencesSql(links, afterCutover) {
  return Prisma.sql`
    WITH source_links AS (${sourceLinksSql(links)})
    SELECT s."code", CASE WHEN t."id" IS NULL THEN ARRAY['missing'] ELSE array_remove(ARRAY[
      CASE WHEN t."code" IS DISTINCT FROM s."code" THEN 'code' END,
      CASE WHEN t."name" IS DISTINCT FROM s."name" THEN 'name' END,
      CASE WHEN t."destination" IS DISTINCT FROM s."destination" THEN 'destination' END,
      CASE WHEN t."status"::text IS DISTINCT FROM s."status" THEN 'status' END,
      CASE WHEN t."expires_at" IS DISTINCT FROM s."expiresAt" THEN 'expiry' END,
      CASE WHEN t."qr_foreground" IS DISTINCT FROM s."qrForeground" THEN 'foreground color' END,
      CASE WHEN t."qr_background" IS DISTINCT FROM s."qrBackground" THEN 'background color' END,
      CASE WHEN t."created_at" IS DISTINCT FROM s."createdAt" THEN 'created time' END,
      CASE WHEN ${afterCutover}
        THEN CASE WHEN t."view_count" < s."viewCount" THEN 'scan count' END
        ELSE CASE WHEN t."view_count" <> s."viewCount" THEN 'scan count' END
      END,
      CASE WHEN coalesce(s."qrLogoUrl", '') <> '' AND a."id" IS NULL THEN 'logo' END
    ], NULL) END AS "differences"
    FROM source_links s
    LEFT JOIN "short_urls" t ON t."id" = s."id"
    LEFT JOIN "assets" a
      ON a."id" = t."qr_logo_asset_id" AND a."storage_bucket" = 'public-images'::"AssetBucket"
  `;
}

function totalsSql(links, visits) {
  return Prisma.sql`
    WITH source_links AS (${sourceLinksSql(links)}),
    source_visits AS (${sourceVisitsSql(visits)}),
    target_visits AS (${targetVisitsSql})
    SELECT
      (SELECT count(*) FROM source_links)::int AS "sourceLinks",
      (SELECT count(*) FROM "short_urls" WHERE "id" IN (SELECT "id" FROM source_links))::int AS "targetLinks",
      (SELECT coalesce(sum("viewCount"), 0) FROM source_links)::text AS "sourceScans",
      (SELECT coalesce(sum("view_count"), 0) FROM "short_urls"
        WHERE "id" IN (SELECT "id" FROM source_links))::text AS "targetScans",
      (SELECT count(*) FROM source_visits)::int AS "sourceVisits",
      (SELECT count(*) FROM target_visits)::int AS "targetVisits",
      (SELECT count(*) FROM source_visits s
        LEFT JOIN target_visits t
          ON t."short_url_id" = s."linkId"
          AND t."visited_at" = s."visitedAt"
          AND t."occurrence" = s."occurrence"
        WHERE t."short_url_id" IS NULL)::int AS "missingVisits"
  `;
}

export async function verifyQrImport({ prisma, exportData, afterCutover = false, allowUnmigratedLogos = false }) {
  const rows = await prisma.$queryRaw(linkDifferencesSql(exportData.links, afterCutover));
  const [totals] = await prisma.$queryRaw(totalsSql(exportData.links, exportData.visits));

  const mismatchedLinks = [];
  const missingLogos = [];
  for (const row of rows) {
    const fields = row.differences.filter((field) => field !== "logo");
    if (fields.length > 0) mismatchedLinks.push({ code: row.code, fields });
    if (row.differences.includes("logo")) missingLogos.push(row.code);
  }

  const sourceScans = BigInt(totals.sourceScans);
  const targetScans = BigInt(totals.targetScans);
  const checks = [
    { name: "Link count", source: totals.sourceLinks, target: totals.targetLinks, ok: totals.sourceLinks === totals.targetLinks },
    { name: "Links with matching settings", source: rows.length, target: rows.length - mismatchedLinks.length, ok: mismatchedLinks.length === 0 },
    {
      name: "Total scan count",
      source: totals.sourceScans,
      target: totals.targetScans,
      ok: afterCutover ? targetScans >= sourceScans : targetScans === sourceScans,
    },
    {
      name: "Visit history rows",
      source: totals.sourceVisits,
      target: totals.targetVisits,
      ok: totals.missingVisits === 0 && (afterCutover || totals.targetVisits === totals.sourceVisits),
    },
    {
      name: "Logos migrated",
      source: rows.length,
      target: rows.length - missingLogos.length,
      ok: allowUnmigratedLogos || missingLogos.length === 0,
    },
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
    mismatchedLinks,
    missingLogos,
    missingVisits: totals.missingVisits,
  };
}

function parseArguments(argv) {
  const options = { exportPath: undefined, afterCutover: false, allowUnmigratedLogos: false };
  for (const argument of argv) {
    if (argument === "--after-cutover") options.afterCutover = true;
    else if (argument === "--allow-unmigrated-logos") options.allowUnmigratedLogos = true;
    else if (!argument.startsWith("--") && !options.exportPath) options.exportPath = argument;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  requireEnvironment(["DATABASE_URL"]);
  const exportData = await readQrExport(options.exportPath);
  const prisma = createPrismaClient();

  try {
    const result = await verifyQrImport({ prisma, exportData, ...options });

    console.log(`Export taken at ${exportData.exportedAt}; mode: ${options.afterCutover ? "after cutover" : "exact"}.`);
    console.table(result.checks.map(({ name, source, target, ok }) => ({ check: name, source, target, result: ok ? "PASS" : "FAIL" })));
    for (const link of result.mismatchedLinks) console.log(`  ${link.code}: ${link.fields.join(", ")} differ`);
    if (result.missingVisits > 0) console.log(`  ${result.missingVisits} source visit(s) are missing from Neon.`);
    if (result.missingLogos.length > 0) console.log(`  Without a migrated logo: ${result.missingLogos.join(", ")}`);
    console.log(result.ok ? "Verification passed." : "Verification FAILED.");

    process.exitCode = result.ok ? 0 : 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.main) {
  await main();
}
