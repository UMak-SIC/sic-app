import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import ws from "ws";

/**
 * Read-only: compares the migrations recorded in the database against the folders on
 * disk, so an applied-but-deleted migration is visible rather than inferred.
 */

neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

const migrationsDir = path.resolve("prisma/migrations");

try {
  const onDisk = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const recorded = await prisma.$queryRawUnsafe(`
    SELECT migration_name,
           finished_at IS NOT NULL AS finished,
           rolled_back_at IS NOT NULL AS rolled_back,
           applied_steps_count
    FROM _prisma_migrations
    ORDER BY migration_name
  `);

  const recordedNames = recorded.map((row) => row.migration_name);

  console.log(`  ${onDisk.length} folder(s) on disk, ${recorded.length} row(s) recorded`);

  const missingOnDisk = recorded.filter((row) => !onDisk.includes(row.migration_name));
  const missingInDb = onDisk.filter((name) => !recordedNames.includes(name));

  console.log("");
  if (missingOnDisk.length === 0) {
    console.log("  recorded but not on disk: none");
  } else {
    console.log("  recorded but not on disk:");
    for (const row of missingOnDisk) {
      console.log(
        `    ${row.migration_name}  finished=${row.finished} rolled_back=${row.rolled_back} steps=${row.applied_steps_count}`
      );
    }
  }

  if (missingInDb.length === 0) {
    console.log("  on disk but not recorded: none");
  } else {
    console.log("  on disk but not recorded (never applied):");
    for (const name of missingInDb) {
      console.log(`    ${name}`);
    }
  }
} finally {
  await prisma.$disconnect();
}