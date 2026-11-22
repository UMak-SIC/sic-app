import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { expect, test } from "vitest";

// Public pages must read data only through lib/public-site, which is where drafts
// and unpublished news are filtered out (PS-01.11). Importing Prisma or an admin
// service from a public page would skip that filter, so it fails here.
//
// To read something new on a public page, add a function to
// lib/public-site/events.ts or lib/public-site/content.ts and use that.

const APP_ROOT = path.resolve(__dirname, "../../..");
const PUBLIC_CODE = ["app/(public)", "app/not-found.tsx", "components/public"];
const FORBIDDEN = [/from\s+["']@\/lib\/prisma["']/, /from\s+["']@\/lib\/services\//, /from\s+["']@prisma\/client["'](?!.*type)/];

function filesUnder(relative: string): string[] {
  const absolute = path.join(APP_ROOT, relative);
  if (statSync(absolute).isFile()) return [absolute];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesUnder(path.join(relative, entry.name))
      : /\.(ts|tsx)$/.test(entry.name)
        ? [path.join(absolute, entry.name)]
        : [],
  );
}

test("public pages read data only through lib/public-site", () => {
  const files = PUBLIC_CODE.flatMap(filesUnder);
  expect(files.length).toBeGreaterThan(10);

  const offenders = files.flatMap((file) => {
    const lines = readFileSync(file, "utf8").split("\n");
    return lines
      .filter((line) => line.trimStart().startsWith("import"))
      .filter((line) => !/^import\s+type\b/.test(line.trim()))
      .filter((line) => FORBIDDEN.some((pattern) => pattern.test(line)))
      .map((line) => `${path.relative(APP_ROOT, file)}: ${line.trim()}`);
  });

  expect(offenders).toEqual([]);
});
