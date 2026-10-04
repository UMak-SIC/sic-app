import { beforeEach, expect, test, vi } from "vitest";

const { attendee, emailDelivery, eventRosterEntry, transaction } = vi.hoisted(() => ({
  attendee: { deleteMany: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  emailDelivery: { deleteMany: vi.fn() },
  eventRosterEntry: { deleteMany: vi.fn() },
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ $transaction: transaction }),
}));

import { runRetention } from "@/lib/services/retention-service";

beforeEach(() => {
  vi.resetAllMocks();
  transaction.mockImplementation((operation) => operation({ attendee, emailDelivery, eventRosterEntry }));
  emailDelivery.deleteMany.mockResolvedValue({ count: 2 });
  eventRosterEntry.deleteMany.mockResolvedValue({ count: 3 });
  attendee.deleteMany.mockResolvedValue({ count: 4 });
  attendee.findMany.mockResolvedValue([{ id: "attendee-id" }]);
  attendee.update.mockResolvedValue({});
});

test("removes expired delivery and roster data, then deletes or anonymizes attendees", async () => {
  const now = new Date("2030-03-01T12:30:45.678Z");

  await expect(runRetention(now)).resolves.toEqual({
    anonymizedAttendees: 1,
    cutoff: new Date("2025-03-01T12:30:45.678Z"),
    deletedAttendees: 4,
    deletedDeliveries: 2,
    deletedRosterEntries: 3,
  });

  const cutoff = new Date("2025-03-01T12:30:45.678Z");
  expect(emailDelivery.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: cutoff } } });
  expect(eventRosterEntry.deleteMany).toHaveBeenCalledWith({
    where: { event: { endsAt: { lt: cutoff } } },
  });
  expect(attendee.deleteMany).toHaveBeenCalledWith({
    where: { createdAt: { lt: cutoff }, rosterEntries: { none: {} } },
  });
  expect(attendee.update).toHaveBeenCalledWith({
    where: { id: "attendee-id" },
    data: {
      displayEmail: "deleted-attendee-id@invalid.local",
      name: "Deleted attendee",
      normalizedEmail: "deleted-attendee-id@invalid.local",
      studentId: "deleted-attendee-id",
    },
  });
});

test("uses the last day of February for leap-day retention cutoffs", async () => {
  attendee.findMany.mockResolvedValue([]);

  await expect(runRetention(new Date("2028-02-29T00:00:00.000Z"))).resolves.toMatchObject({
    cutoff: new Date("2023-02-28T00:00:00.000Z"),
  });
});
