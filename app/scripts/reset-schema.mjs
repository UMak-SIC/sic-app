import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

/**
 * Drops and recreates the public schema so every migration can be re-applied from
 * scratch. Used to recover a database left half-migrated by a migration that
 * committed part of its DDL before failing.
 *
 * This destroys all data. The only row in the development database is the
 * administrator, which `pnpm admin:bootstrap` recreates from
 * ADMIN_NEON_AUTH_USER_ID.
 */

if (process.env.ALLOW_SCHEMA_RESET !== "yes") {
  throw new Error(
    "Refusing to drop the public schema. Re-run with ALLOW_SCHEMA_RESET=yes to confirm.",
  );
}

neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

try {
  // _prisma_migrations goes with the schema, which is the point: the ledger should
  // describe only migrations that have actually run against the new schema.
  await prisma.$executeRawUnsafe(`DROP SCHEMA public CASCADE`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA public`);
  console.log("  public schema dropped and recreated");
} finally {
  await prisma.$disconnect();
}
