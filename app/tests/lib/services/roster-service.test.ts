import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { EventStatus, RosterEntryStatus } from "@prisma/client";

const { createMany, eventFindUnique, attendeeFindMany, transaction } = vi.hoisted(() => {
  const createMany = vi.fn();
  const eventFindUnique = vi.fn();
  const attendeeFindMany = vi.fn();

  return {
    createMany,
    eventFindUnique,
    attendeeFindMany,
    // Mirrors Prisma's callback form, so the service's reads and its insert are
    // reached through the transaction handle.
    transaction: vi.fn(async (handler: (tx: unknown) => Promise<unknown>) =>
      handler({
        event: { findUnique: eventFindUnique },
        attendee: { findMany: attendeeFindMany },
        eventRosterEntry: { createMany },
      })
    ),
  };
});

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ $transaction: transaction }),
}));

import { addAttendeesToEvent, MAX_ROSTER_BATCH, RosterError } from "@/lib/services/roster-service";

const EVENT_ID = "9fdcd48a-170a-4af7-862e-a511ad9d7b94";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  eventFindUnique.mockResolvedValue({ id: EVENT_ID, status: EventStatus.PUBLISHED });
  attendeeFindMany.mockResolvedValue([{ id: A }, { id: B }]);
  createMany.mockResolvedValue({ count: 2 });
});

afterEach(() => {
  vi.resetAllMocks();
});

test("adds students as pending, with no arrival time or scanner", async () => {
  await addAttendeesToEvent({ eventId: EVENT_ID, attendeeIds: [A, B] });

  // The table's check constraint requires a pending entry to carry neither, and
  // pending is the only state that means "on the roster but has not arrived".
  expect(createMany).toHaveBeenCalledWith({
    data: [
      { eventId: EVENT_ID, attendeeId: A, status: RosterEntryStatus.PENDING },
      { eventId: EVENT_ID, attendeeId: B, status: RosterEntryStatus.PENDING },
    ],
    skipDuplicates: true,
  });
});

test("reports how many were added, already present, and unknown", async () => {
  // One already on the roster, one who is not in the registry at all.
  createMany.mockResolvedValue({ count: 1 });
  attendeeFindMany.mockResolvedValue([{ id: A }]);

  const result = await addAttendeesToEvent({ eventId: EVENT_ID, attendeeIds: [A, B] });

  expect(result).toEqual({
    added: 1,
    alreadyOnRoster: 0,
    unknownCount: 1,
    unknownStudentIds: [B],
  });
});

test("counts an already-present student rather than failing", async () => {
  // Re-running a partly applied batch has to be safe.
  createMany.mockResolvedValue({ count: 0 });

  const result = await addAttendeesToEvent({ eventId: EVENT_ID, attendeeIds: [A, B] });

  expect(result).toMatchObject({ added: 0, alreadyOnRoster: 2, unknownCount: 0 });
});

test("writes nothing when nobody in the batch exists", async () => {
  attendeeFindMany.mockResolvedValue([]);

  const result = await addAttendeesToEvent({ eventId: EVENT_ID, attendeeIds: [A, B] });

  expect(createMany).not.toHaveBeenCalled();
  expect(result).toMatchObject({ added: 0, unknownCount: 2, unknownStudentIds: [A, B] });
});

test("de-duplicates the request before touching the database", async () => {
  await addAttendeesToEvent({ eventId: EVENT_ID, attendeeIds: [A, A, A] });

  expect(attendeeFindMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: { in: [A] } } })
  );
});

test("refuses a closed event", async () => {
  eventFindUnique.mockResolvedValue({ id: EVENT_ID, status: EventStatus.CLOSED });

  // A closed event's pending entries were already marked absent, so adding now
  // would record someone on a finished roster who never came.
  await expect(
    addAttendeesToEvent({ eventId: EVENT_ID, attendeeIds: [A] })
  ).rejects.toBeInstanceOf(RosterError);
  expect(createMany).not.toHaveBeenCalled();
});

test("allows a draft event, whose roster is being built", async () => {
  eventFindUnique.mockResolvedValue({ id: EVENT_ID, status: EventStatus.DRAFT });

  await expect(
    addAttendeesToEvent({ eventId: EVENT_ID, attendeeIds: [A] })
  ).resolves.toMatchObject({ added: 2 });
});

test("reports a missing event", async () => {
  eventFindUnique.mockResolvedValue(null);

  await expect(
    addAttendeesToEvent({ eventId: EVENT_ID, attendeeIds: [A] })
  ).rejects.toThrow("no longer exists");
});

test("rejects an empty or oversized batch", async () => {
  await expect(addAttendeesToEvent({ eventId: EVENT_ID, attendeeIds: [] })).rejects.toThrow(
    "at least one student"
  );

  const tooMany = Array.from({ length: MAX_ROSTER_BATCH + 1 }, (_, index) => `${index}`);
  await expect(
    addAttendeesToEvent({ eventId: EVENT_ID, attendeeIds: tooMany })
  ).rejects.toThrow("at most");
});

test("keeps the event lookup and the insert in one transaction", async () => {
  await addAttendeesToEvent({ eventId: EVENT_ID, attendeeIds: [A] });

  // Otherwise a roster could be built against an event that closed in between.
  expect(transaction).toHaveBeenCalledOnce();
});
