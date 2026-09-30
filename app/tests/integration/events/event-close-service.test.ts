import { describe, expect, test } from "vitest";

import { closeExpiredEvents } from "@/lib/services/event-close-service";
import { getTestDatabase, hasTestDatabase } from "@/tests/setup";

const describeWithDatabase = hasTestDatabase() ? describe : describe.skip;

describeWithDatabase("closeExpiredEvents", () => {
  test("is safe under concurrent invocation and preserves attended entries", async () => {
    const db = getTestDatabase();
    const now = new Date("2026-10-01T12:00:00.000Z");
    await db.admin.create({ data: { neonAuthUserId: "admin-id" } });
    const pendingAttendee = await db.attendee.create({
      data: {
        normalizedEmail: "pending@example.com",
        displayEmail: "pending@example.com",
        name: "Pending Attendee",
        studentId: "pending-id",
      },
    });
    const attendedAttendee = await db.attendee.create({
      data: {
        normalizedEmail: "attended@example.com",
        displayEmail: "attended@example.com",
        name: "Attended Attendee",
        studentId: "attended-id",
      },
    });
    const event = await db.event.create({
      data: {
        name: "Expired Event",
        details: "Details",
        startsAt: new Date("2026-10-01T09:00:00.000Z"),
        endsAt: new Date("2026-10-01T10:00:00.000Z"),
        status: "PUBLISHED",
        createdById: "admin-id",
      },
    });
    const pendingEntry = await db.eventRosterEntry.create({
      data: { eventId: event.id, attendeeId: pendingAttendee.id },
    });
    const attendedEntry = await db.eventRosterEntry.create({
      data: {
        eventId: event.id,
        attendeeId: attendedAttendee.id,
        status: "ATTENDED",
        arrivedAt: now,
        scannedByAdminId: "admin-id",
      },
    });

    await Promise.all([closeExpiredEvents(now), closeExpiredEvents(now)]);

    await expect(db.event.findUniqueOrThrow({ where: { id: event.id } })).resolves.toMatchObject({
      status: "CLOSED",
      closedAt: now,
    });
    await expect(db.eventRosterEntry.findUniqueOrThrow({ where: { id: pendingEntry.id } })).resolves.toMatchObject({
      status: "ABSENT",
    });
    await expect(db.eventRosterEntry.findUniqueOrThrow({ where: { id: attendedEntry.id } })).resolves.toMatchObject({
      status: "ATTENDED",
      arrivedAt: now,
    });
  });
});
