import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, expect, test } from "vitest";

import { checkInRosterEntry } from "@/lib/services/checkin-service";
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

test.skipIf(!hasTestDatabase())("allows one concurrent check-in and returns the same original arrival time to the duplicate", async () => {
  const adminId = `admin-${randomUUID()}`;
  const attendeeId = randomUUID();
  const eventId = randomUUID();
  const rosterEntryId = randomUUID();

  await seedTestDatabase(async (database) => {
    await database.admin.create({ data: { neonAuthUserId: adminId } });
    await database.attendee.create({
      data: {
        id: attendeeId,
        normalizedEmail: `${attendeeId}@example.test`,
        displayEmail: `${attendeeId}@example.test`,
        name: "Check-in Test Attendee",
        studentId: attendeeId,
      },
    });
    await database.event.create({
      data: {
        id: eventId,
        name: "Check-in Test Event",
        details: "Check-in test event details",
        startsAt: new Date("2026-10-01T08:00:00.000Z"),
        endsAt: new Date("2026-10-01T10:00:00.000Z"),
        createdById: adminId,
      },
    });
    await database.eventRosterEntry.create({ data: { id: rosterEntryId, eventId, attendeeId } });
  });

  const [firstResult, secondResult] = await Promise.all([
    checkInRosterEntry({ eventId, rosterEntryId, scannedByAdminId: adminId }),
    checkInRosterEntry({ eventId, rosterEntryId, scannedByAdminId: adminId }),
  ]);

  expect([firstResult.status, secondResult.status].sort()).toEqual(["checked_in", "duplicate"]);
  const results = [firstResult, secondResult];
  const checkedIn = results.find((result) => result.status === "checked_in");
  const duplicate = results.find((result) => result.status === "duplicate");
  if (checkedIn?.status !== "checked_in" || duplicate?.status !== "duplicate") {
    throw new Error("Expected one checked-in result and one duplicate result.");
  }
  expect(checkedIn.arrivedAt).toEqual(duplicate.arrivedAt);
  await expect(
    getTestDatabase().eventRosterEntry.findUniqueOrThrow({ where: { id: rosterEntryId } }),
  ).resolves.toMatchObject({ status: "ATTENDED", arrivedAt: checkedIn.arrivedAt, scannedByAdminId: adminId });
});
