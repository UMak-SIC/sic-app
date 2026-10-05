import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { EventStatus } from "@prisma/client";

const { eventFindUnique, attendeeCount, rosterCreateMany, rosterDeleteMany, rosterFindMany, organizerDeleteMany, organizerCreateMany, transaction } = vi.hoisted(() => {
  const eventFindUnique = vi.fn();
  const attendeeCount = vi.fn();
  const rosterCreateMany = vi.fn();
  const rosterDeleteMany = vi.fn();
  const rosterFindMany = vi.fn();
  const organizerDeleteMany = vi.fn();
  const organizerCreateMany = vi.fn();
  return {
    eventFindUnique,
    attendeeCount,
    rosterCreateMany,
    rosterDeleteMany,
    rosterFindMany,
    organizerDeleteMany,
    organizerCreateMany,
    transaction: vi.fn(async (handler: (tx: unknown) => Promise<unknown>) => handler({
      event: { findUnique: eventFindUnique },
      attendee: { count: attendeeCount },
      eventRosterEntry: { createMany: rosterCreateMany, deleteMany: rosterDeleteMany, findMany: rosterFindMany },
      eventOrganizer: { deleteMany: organizerDeleteMany, createMany: organizerCreateMany },
    })),
  };
});

vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => ({ $transaction: transaction }) }));

import { EventOrganizerError, saveEventPeople } from "@/lib/services/event-organizer-service";

const EVENT_ID = "9fdcd48a-170a-4af7-862e-a511ad9d7b94";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  eventFindUnique.mockResolvedValue({ status: EventStatus.PUBLISHED });
  attendeeCount.mockResolvedValue(2);
  rosterCreateMany.mockResolvedValue({ count: 1 });
  rosterDeleteMany.mockResolvedValue({ count: 0 });
  rosterFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ attendeeId: A }]);
  organizerDeleteMany.mockResolvedValue({ count: 0 });
  organizerCreateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => vi.resetAllMocks());

test("saves the roster and organizer list in one transaction", async () => {
  await expect(saveEventPeople(EVENT_ID, [A, A], [B])).resolves.toEqual({
    addedAttendees: 1,
    attendeeIds: [A],
    organizerIds: [B],
  });

  expect(rosterCreateMany).toHaveBeenCalledWith({
    data: [{ eventId: EVENT_ID, attendeeId: A }],
    skipDuplicates: true,
  });
  expect(rosterDeleteMany).toHaveBeenCalledWith({
    where: {
      eventId: EVENT_ID,
      attendeeId: { notIn: [A] },
      status: "PENDING",
      deliveries: { none: {} },
    },
  });
  expect(organizerDeleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
  expect(organizerCreateMany).toHaveBeenCalledWith({ data: [{ eventId: EVENT_ID, attendeeId: B }] });
  expect(transaction).toHaveBeenCalledOnce();
});

test("rejects a closed event before changing either list", async () => {
  eventFindUnique.mockResolvedValue({ status: EventStatus.CLOSED });

  await expect(saveEventPeople(EVENT_ID, [A], [B])).rejects.toBeInstanceOf(EventOrganizerError);
  expect(rosterCreateMany).not.toHaveBeenCalled();
  expect(organizerDeleteMany).not.toHaveBeenCalled();
});

test("rejects a directory entry that no longer exists", async () => {
  attendeeCount.mockResolvedValue(1);

  await expect(saveEventPeople(EVENT_ID, [A], [B])).rejects.toThrow("no longer in the attendee directory");
  expect(rosterCreateMany).not.toHaveBeenCalled();
});

test("rejects removing an attendee with delivery or attendance history", async () => {
  attendeeCount.mockResolvedValue(1);
  rosterFindMany.mockReset();
  rosterFindMany.mockResolvedValue([{ attendee: { name: "Ada Lovelace" } }]);

  await expect(saveEventPeople(EVENT_ID, [], [B])).rejects.toThrow("attendance or email history");
  expect(rosterDeleteMany).not.toHaveBeenCalled();
  expect(rosterCreateMany).not.toHaveBeenCalled();
});
