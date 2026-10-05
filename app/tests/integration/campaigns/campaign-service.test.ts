import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, expect, test } from "vitest";

import { submitCampaign } from "@/lib/services/campaign-service";
import { getTestDatabase, hasTestDatabase, seedTestDatabase } from "@/tests/setup";

const originalDatabaseUrl = process.env.DATABASE_URL;

beforeEach(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

async function seedCampaignContext() {
  const adminId = `admin-${randomUUID()}`;
  const eventId = randomUUID();
  const attendeeIds = Array.from({ length: 126 }, () => randomUUID());

  await seedTestDatabase(async (database) => {
    await database.admin.create({ data: { neonAuthUserId: adminId } });
    await database.event.create({
      data: {
        id: eventId,
        name: "Campaign test event",
        details: "Campaign test event details",
        startsAt: new Date("2026-10-01T08:00:00.000Z"),
        endsAt: new Date("2026-10-01T10:00:00.000Z"),
        status: "PUBLISHED",
        createdById: adminId,
      },
    });
    await database.attendee.createMany({
      data: attendeeIds.map((id) => ({
        id,
        normalizedEmail: `${id}@example.test`,
        displayEmail: `${id}@example.test`,
        name: "Campaign Test Attendee",
        studentId: id,
      })),
    });
  });

  return { adminId, eventId, attendeeIds };
}

test.skipIf(!hasTestDatabase())("creates one roster entry, delivery, and queue job for every selected attendee", async () => {
  const { adminId, eventId, attendeeIds } = await seedCampaignContext();

  const result = await submitCampaign({
    idempotencyKey: crypto.randomUUID(),
    eventId,
    attendeeIds,
    subject: "Campaign test",
    markdown: "Campaign body",
    createdById: adminId,
  });

  expect(result.queuedCount).toBe(attendeeIds.length);
  await expect(getTestDatabase().eventRosterEntry.count({ where: { eventId } })).resolves.toBe(attendeeIds.length);
  await expect(getTestDatabase().emailDelivery.count({ where: { campaignId: result.campaignId } })).resolves.toBe(attendeeIds.length);
  await expect(getTestDatabase().queueJob.count({ where: { delivery: { campaignId: result.campaignId } } })).resolves.toBe(attendeeIds.length);
}, 15_000);

test.skipIf(!hasTestDatabase())("rolls back campaign records when delivery queue creation fails", async () => {
  const { adminId, eventId, attendeeIds } = await seedCampaignContext();

  await expect(submitCampaign({
    idempotencyKey: randomUUID(),
    eventId,
    attendeeIds,
    subject: "Campaign test",
    markdown: "Campaign body",
    createdById: adminId,
  }, {
    generateDeliveryIdempotencyKey: () => "00000000-0000-4000-8000-000000000001",
  })).rejects.toThrow();

  await expect(getTestDatabase().campaign.count({ where: { eventId } })).resolves.toBe(0);
  await expect(getTestDatabase().eventRosterEntry.count({ where: { eventId } })).resolves.toBe(0);
  await expect(getTestDatabase().emailDelivery.count({ where: { eventId } })).resolves.toBe(0);
  await expect(getTestDatabase().queueJob.count()).resolves.toBe(0);
}, 15_000);
