import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Prisma, PrismaClient } from "@prisma/client";
import ws from "ws";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

neonConfig.webSocketConstructor = ws;

const testDatabase = testDatabaseUrl
  ? new PrismaClient({
      adapter: new PrismaNeon({ connectionString: testDatabaseUrl }),
    })
  : undefined;

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
  return testDatabase !== undefined;
}

export function getTestDatabase(): PrismaClient {
  if (!testDatabase) {
    throw new Error(
      "Database tests require TEST_DATABASE_URL for an isolated Neon test branch.",
    );
  }

  return testDatabase;
}

export async function cleanTestDatabase(): Promise<void> {
  if (!testDatabase) {
    return;
  }

  await testDatabase.$executeRawUnsafe(
    `TRUNCATE TABLE ${applicationTables.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
}

export async function disconnectTestDatabase(): Promise<void> {
  await testDatabase?.$disconnect();
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
