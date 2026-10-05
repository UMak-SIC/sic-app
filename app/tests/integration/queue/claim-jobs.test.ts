import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, expect, test } from "vitest";

import { claimQueueJobs } from "@/lib/queue/claim-jobs";
import { getTestDatabase, hasTestDatabase, seedTestDatabase } from "@/tests/setup";

const originalDatabaseUrl = process.env.DATABASE_URL;

beforeEach(() => {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
});

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

test.skipIf(!hasTestDatabase())("does not claim the same job twice concurrently", async () => {
  const adminId = `admin-${randomUUID()}`;
  const attendeeId = randomUUID();
  const eventId = randomUUID();
  const rosterEntryId = randomUUID();
  const campaignId = randomUUID();
  const deliveryId = randomUUID();

  await seedTestDatabase(async (database) => {
    await database.admin.create({ data: { neonAuthUserId: adminId } });
    await database.attendee.create({
      data: {
        id: attendeeId,
        normalizedEmail: `${attendeeId}@example.test`,
        displayEmail: `${attendeeId}@example.test`,
        name: "Queue Test Attendee",
        studentId: attendeeId,
      },
    });
    await database.event.create({
      data: {
        id: eventId,
        name: "Queue Test Event",
        details: "Queue test event details",
        startsAt: new Date("2026-10-01T08:00:00.000Z"),
        endsAt: new Date("2026-10-01T10:00:00.000Z"),
        createdById: adminId,
      },
    });
    await database.eventRosterEntry.create({
      data: { id: rosterEntryId, eventId, attendeeId },
    });
    await database.campaign.create({
      data: {
        id: campaignId,
        eventId,
        idempotencyKey: "queue-test-campaign",
        subject: "Queue test campaign",
        markdown: "Queue test campaign body",
        createdById: adminId,
      },
    });
    await database.emailDelivery.create({
      data: {
        id: deliveryId,
        eventId,
        campaignId,
        rosterEntryId,
        idempotencyKey: randomUUID(),
      },
    });
    await database.queueJob.create({ data: { deliveryId } });
  });

  const [firstClaim, secondClaim] = await Promise.all([
    claimQueueJobs({ workerId: "worker-a" }),
    claimQueueJobs({ workerId: "worker-b" }),
  ]);

  expect([...firstClaim, ...secondClaim]).toHaveLength(1);
  await expect(
    getTestDatabase().queueJob.findUniqueOrThrow({ where: { deliveryId } }),
  ).resolves.toMatchObject({ status: "PROCESSING", lockedBy: expect.stringMatching(/^worker-[ab]$/) });
  await expect(
    getTestDatabase().emailDelivery.findUniqueOrThrow({ where: { id: deliveryId } }),
  ).resolves.toMatchObject({ status: "SENDING" });
}, 15_000);
