import { readFile } from "node:fs/promises";

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Prisma, PrismaClient } from "@prisma/client";
import ws from "ws";

export const EXPORT_FORMAT = "sic-qr-export/v1";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[A-Za-z]{7}$/;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
// Mirrors the short_urls destination CHECK so a bad row fails before any write.
const DESTINATION_PATTERN = /^https:\/\/[^/?#\s]+([/?#].*)?$/;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;
const COUNT_PATTERN = /^\d+$/;
const MAX_REPORTED_PROBLEMS = 20;

function isTimestamp(value) {
  return typeof value === "string" && TIMESTAMP_PATTERN.test(value);
}

function linkProblems(link, index) {
  const label = `links[${index}]${typeof link?.code === "string" ? ` (${link.code})` : ""}`;
  if (!link || typeof link !== "object") return [`${label} is not an object.`];

  const problems = [];
  const check = (valid, message) => {
    if (!valid) problems.push(`${label} ${message}`);
  };

  check(typeof link.id === "string" && UUID_PATTERN.test(link.id), "has an invalid id.");
  check(typeof link.code === "string" && CODE_PATTERN.test(link.code), "has an invalid code.");
  check(typeof link.name === "string" && link.name.length > 0, "has an empty name.");
  check(
    typeof link.destination === "string" &&
      DESTINATION_PATTERN.test(link.destination) &&
      !/\s/.test(link.destination),
    "has a destination that is not an absolute HTTPS address.",
  );
  check(typeof link.viewCount === "string" && COUNT_PATTERN.test(link.viewCount), "has an invalid scan count.");
  check(link.status === "active" || link.status === "disabled", "has an unknown status.");
  check(link.expiresAt === null || isTimestamp(link.expiresAt), "has an invalid expiry.");
  check(typeof link.qrForeground === "string" && COLOR_PATTERN.test(link.qrForeground), "has an invalid foreground color.");
  check(typeof link.qrBackground === "string" && COLOR_PATTERN.test(link.qrBackground), "has an invalid background color.");
  check(link.qrLogoUrl === null || typeof link.qrLogoUrl === "string", "has an invalid logo address.");
  check(isTimestamp(link.createdAt), "has an invalid created time.");
  check(isTimestamp(link.updatedAt), "has an invalid updated time.");

  return problems;
}

/**
 * Parses and strictly validates the JSON emitted by export-supabase-qr-data.sql.
 * Every problem is collected so the operator can fix an export in one pass; no
 * caller writes anything unless this returns.
 */
export function parseQrExport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("The export file is not valid JSON.");
  }

  if (!data || data.format !== EXPORT_FORMAT) {
    throw new Error(`The export file is not a ${EXPORT_FORMAT} export.`);
  }
  if (!Array.isArray(data.links) || !Array.isArray(data.visits)) {
    throw new Error("The export file must contain links and visits arrays.");
  }

  const problems = data.links.flatMap(linkProblems);
  const ids = new Set();
  const codes = new Set();

  for (const link of data.links) {
    if (ids.has(link?.id)) problems.push(`Link id ${link.id} appears more than once.`);
    if (codes.has(link?.code)) problems.push(`Code ${link.code} appears more than once.`);
    ids.add(link?.id);
    codes.add(link?.code);
  }

  data.visits.forEach((visit, index) => {
    if (!visit || !ids.has(visit.linkId)) {
      problems.push(`visits[${index}] does not belong to an exported link.`);
    } else if (!isTimestamp(visit.visitedAt)) {
      problems.push(`visits[${index}] has an invalid visit time.`);
    }
  });

  if (problems.length > 0) {
    const shown = problems.slice(0, MAX_REPORTED_PROBLEMS).map((problem) => `  - ${problem}`);
    const hidden = problems.length - shown.length;
    throw new Error(
      [`The export file failed validation:`, ...shown, ...(hidden > 0 ? [`  ...and ${hidden} more.`] : [])].join("\n"),
    );
  }

  return { exportedAt: data.exportedAt, links: data.links, visits: data.visits };
}

export async function readQrExport(path) {
  if (!path) throw new Error("Pass the export file path as the first argument.");
  return parseQrExport(await readFile(path, "utf8"));
}

/**
 * Source links as a relation. Timestamps stay text until Postgres casts them,
 * so microseconds are compared exactly rather than through JavaScript Dates.
 */
export function sourceLinksSql(links) {
  return Prisma.sql`
    SELECT * FROM jsonb_to_recordset(${JSON.stringify(links)}::jsonb) AS s(
      "id" uuid, "code" text, "name" text, "destination" text, "viewCount" bigint,
      "status" text, "expiresAt" timestamptz, "qrForeground" text, "qrBackground" text,
      "qrLogoUrl" text, "qrLogoAssetId" uuid, "createdAt" timestamptz, "updatedAt" timestamptz
    )
  `;
}

/**
 * Visits numbered within identical (link, time) pairs so two genuine scans in
 * the same microsecond are compared as a multiset rather than collapsed.
 */
export function sourceVisitsSql(visits) {
  return Prisma.sql`
    SELECT "linkId", "visitedAt",
      row_number() OVER (PARTITION BY "linkId", "visitedAt") AS "occurrence"
    FROM jsonb_to_recordset(${JSON.stringify(visits)}::jsonb) AS v("linkId" uuid, "visitedAt" timestamptz)
  `;
}

export const targetVisitsSql = Prisma.sql`
  SELECT "short_url_id", "visited_at",
    row_number() OVER (PARTITION BY "short_url_id", "visited_at") AS "occurrence"
  FROM "short_url_visits"
  WHERE "short_url_id" IN (SELECT "id" FROM source_links)
`;

export function requireEnvironment(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function createPrismaClient() {
  neonConfig.webSocketConstructor = ws;
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
}
