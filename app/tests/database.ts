import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Prisma, PrismaClient } from "@prisma/client";
import ws from "ws";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const activeDatabaseUrl = process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required to run database tests.");
}

neonConfig.webSocketConstructor = ws;

const testDatabase = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: testDatabaseUrl }),
});

const applicationTables = [
  "delivery_attempts",
  "queue_jobs",
  "email_deliveries",
  "campaign_assets",
  "event_roster_entries",
  "campaigns",
  "events",
  "assets",
  "provider_daily_usage",
  "attendees",
  "admins",
];

export function hasTestDatabase(): boolean {
  return true;
}

export function getTestDatabase(): PrismaClient {
  return testDatabase;
}

export async function cleanTestDatabase(): Promise<void> {
  if (activeDatabaseUrl === testDatabaseUrl) {
    throw new Error(
      "Refusing to truncate because DATABASE_URL points to TEST_DATABASE_URL.",
    );
  }

  await testDatabase.$executeRawUnsafe(
    `TRUNCATE TABLE ${applicationTables.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
}

export async function disconnectTestDatabase(): Promise<void> {
  await testDatabase.$disconnect();
}

export async function seedTestDatabase<T>(
  seed: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return withTestTransaction(seed);
}

export async function withTestTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return getTestDatabase().$transaction(operation);
}
