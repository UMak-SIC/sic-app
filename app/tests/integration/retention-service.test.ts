import { expect, test } from "vitest";

import { runRetention } from "@/lib/services/retention-service";
import { getTestDatabase, hasTestDatabase } from "@/tests/setup";

const databaseTest = hasTestDatabase() ? test : test.skip;

databaseTest("removes expired records and anonymizes attendees still referenced by current events", async () => {
  const database = getTestDatabase();
  const now = new Date("2030-01-01T00:00:00.000Z");
  const expired = new Date("2024-12-31T00:00:00.000Z");
  const current = new Date("2030-12-31T00:00:00.000Z");

  await database.admin.create({ data: { neonAuthUserId: "admin-id" } });
  const [expiredEvent, currentEvent] = await Promise.all([
    database.event.create({
      data: {
        createdById: "admin-id",
        details: "Expired event",
        endsAt: expired,
        name: "Expired event",
        startsAt: expired,
      },
    }),
    database.event.create({
      data: {
        createdById: "admin-id",
        details: "Current event",
        endsAt: current,
        name: "Current event",
        startsAt: now,
      },
    }),
  ]);
  const [unreferenced, retained, historical] = await Promise.all([
    database.attendee.create({
      data: {
        createdAt: expired,
        displayEmail: "remove@example.com",
        name: "Remove me",
        normalizedEmail: "remove@example.com",
        studentId: "remove-me",
      },
    }),
    database.attendee.create({
      data: {
        createdAt: expired,
        displayEmail: "retain@example.com",
        name: "Retain relation",
        normalizedEmail: "retain@example.com",
        studentId: "retain-relation",
      },
    }),
    database.attendee.create({
      data: {
        displayEmail: "history@example.com",
        name: "Historical relation",
        normalizedEmail: "history@example.com",
        studentId: "historical-relation",
      },
    }),
  ]);
  const [currentRosterEntry, historicalRosterEntry] = await Promise.all([
    database.eventRosterEntry.create({
      data: { attendeeId: retained.id, eventId: currentEvent.id },
    }),
    database.eventRosterEntry.create({
      data: { attendeeId: historical.id, eventId: expiredEvent.id },
    }),
  ]);
  const campaign = await database.campaign.create({
    data: {
      createdById: "admin-id",
      eventId: currentEvent.id,
      idempotencyKey: "retention-test-campaign",
      markdown: "Test campaign",
      subject: "Test campaign",
    },
  });
  const delivery = await database.emailDelivery.create({
    data: {
      campaignId: campaign.id,
      createdAt: expired,
      eventId: currentEvent.id,
      idempotencyKey: "retention-delivery",
      rosterEntryId: currentRosterEntry.id,
    },
  });

  await expect(runRetention(now)).resolves.toMatchObject({
    anonymizedAttendees: 1,
    assetDeletionFailures: 0,
    deletedAssets: 0,
    deletedAttendees: 1,
    deletedDeliveries: 1,
    deletedRosterEntries: 1,
  });
  await expect(database.emailDelivery.findUnique({ where: { id: delivery.id } })).resolves.toBeNull();
  await expect(
    database.eventRosterEntry.findUnique({ where: { id: historicalRosterEntry.id } }),
  ).resolves.toBeNull();
  await expect(database.attendee.findUnique({ where: { id: unreferenced.id } })).resolves.toBeNull();
  await expect(database.attendee.findUnique({ where: { id: retained.id } })).resolves.toMatchObject({
    displayEmail: `deleted-${retained.id}@invalid.local`,
    name: "Deleted attendee",
    normalizedEmail: `deleted-${retained.id}@invalid.local`,
    studentId: `deleted-${retained.id}`,
  });
});
