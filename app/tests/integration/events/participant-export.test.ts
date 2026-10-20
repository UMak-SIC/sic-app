import { afterEach, describe, expect, test, vi } from "vitest";
import { getTestDatabase, hasTestDatabase } from "@/tests/setup";

vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => getTestDatabase() }));

import { exportEventParticipants, exportEvents, exportParticipants } from "@/lib/services/participant-export-service";

const describeWithDatabase = hasTestDatabase() ? describe : describe.skip;
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("participant CSV exports", () => {
  test("reads event rosters and student history with both check-in timezones", async () => {
    vi.stubEnv("ORGANIZATION_TIMEZONE", "Asia/Manila");
    const db = getTestDatabase();
    await db.admin.create({ data: { neonAuthUserId: "export-admin" } });
    const student = await db.attendee.create({ data: {
      normalizedEmail: "andrea@example.test", displayEmail: "andrea@example.test",
      name: "Andrea Santos", studentId: "00123", course: "BSIT",
      program: "Information Technology", section: "BSIT-2A",
    } });
    const newStudent = await db.attendee.create({ data: {
      normalizedEmail: "maria@example.test", displayEmail: "maria@example.test",
      name: "Maria Cruz", studentId: "00124",
    } });
    const event = await db.event.create({ data: {
      name: "General Assembly", details: "Welcome", createdById: "export-admin",
      startsAt: new Date("2026-10-20T20:00:00Z"), endsAt: new Date("2026-10-20T23:00:00Z"),
    } });
    await db.eventRosterEntry.create({ data: {
      eventId: event.id, attendeeId: student.id, status: "ATTENDED",
      arrivedAt: new Date("2026-10-20T22:15:30Z"), scannedByAdminId: "export-admin",
    } });

    const participantExport = await exportEventParticipants(event.id);
    expect(participantExport.events).toHaveLength(1);
    expect(participantExport.csv).toContain('"BSIT","Information Technology","BSIT-2A","Attended","2026-10-20T22:15:30.000Z","2026-10-21T06:15:30+08:00"');
    expect(participantExport.csv).not.toContain('"Event ID"');
    expect(participantExport.csv).not.toContain('"Added to Event (UTC)"');
    expect(participantExport.csv).not.toContain("Maria Cruz");

    const directoryCsv = await exportParticipants([student.id, newStudent.id]);
    expect(directoryCsv).toContain("Andrea Santos");
    expect(directoryCsv).toContain("Maria Cruz");
    expect(directoryCsv).toContain('"1","1","100","Attended"');
    expect(directoryCsv).toContain('"2026-10-21T06:15:30+08:00"');
    expect(directoryCsv).not.toContain('"Ticket Status"');

    const eventsExport = await exportEvents([event.id]);
    expect(eventsExport.csv).toContain('"General Assembly"');
    expect(eventsExport.csv).toContain("Andrea Santos");
  }, 15_000);
});
