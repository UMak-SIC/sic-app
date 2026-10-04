import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { eventFindMany, eventUpdateMany, rosterUpdateMany, transaction } = vi.hoisted(() => ({
  eventFindMany: vi.fn(),
  eventUpdateMany: vi.fn(),
  rosterUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ $transaction: transaction }),
}));

import { closeExpiredEvents } from "@/lib/services/event-close-service";

const now = new Date("2026-10-01T12:00:00.000Z");

beforeEach(() => {
  transaction.mockImplementation((operation) =>
    operation({
      event: { findMany: eventFindMany, updateMany: eventUpdateMany },
      eventRosterEntry: { updateMany: rosterUpdateMany },
    }),
  );
});

afterEach(() => {
  vi.resetAllMocks();
});

test("closes only expired published events and marks only pending entries absent", async () => {
  eventFindMany.mockResolvedValue([{ id: "event-a" }, { id: "event-b" }]);
  eventUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
  rosterUpdateMany.mockResolvedValue({ count: 3 });

  await expect(closeExpiredEvents(now)).resolves.toEqual({
    closedEventCount: 1,
    absentEntryCount: 3,
  });
  expect(eventFindMany).toHaveBeenCalledWith({
    where: { status: "PUBLISHED", endsAt: { lte: now } },
    select: { id: true },
  });
  expect(eventUpdateMany).toHaveBeenNthCalledWith(1, {
    where: { id: "event-a", status: "PUBLISHED", endsAt: { lte: now } },
    data: { status: "CLOSED", closedAt: now },
  });
  expect(rosterUpdateMany).toHaveBeenCalledWith({
    where: { eventId: "event-a", status: "PENDING" },
    data: { status: "ABSENT" },
  });
});

test("is idempotent when no published event remains to close", async () => {
  eventFindMany.mockResolvedValue([]);

  await expect(closeExpiredEvents(now)).resolves.toEqual({
    closedEventCount: 0,
    absentEntryCount: 0,
  });
  expect(eventUpdateMany).not.toHaveBeenCalled();
  expect(rosterUpdateMany).not.toHaveBeenCalled();
});
