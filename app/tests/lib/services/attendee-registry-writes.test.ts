import { afterEach, beforeEach, expect, test, vi } from "vitest";

const {
  findMany,
  findFirst,
  findUnique,
  create,
  update,
  updateMany,
  $transaction,
} = vi.hoisted(() => {
  const findMany = vi.fn();
  const findFirst = vi.fn();
  const findUnique = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const updateMany = vi.fn();

  return {
    findMany,
    findFirst,
    findUnique,
    create,
    update,
    updateMany,
    $transaction: vi.fn(async (handler: (tx: unknown) => Promise<unknown>) =>
      handler({ attendee: { findMany, create, update, updateMany } })
    ),
  };
});

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    attendee: { findMany, findFirst, findUnique, create, update, updateMany },
    $transaction,
  }),
}));

import {
  AttendeeWriteError,
  applyAttendeeImport,
  createAttendee,
  MAX_REMOVE_BATCH,
  removeAttendees,
  softDeleteAttendee,
  updateAttendee,
} from "@/lib/services/attendee-service";

/**
 * Adding, editing and removing one student.
 *
 * The awkward part of a soft delete is that `normalized_email` and `student_id` stay
 * unique across removed rows, so a removed student still holds their identity. Most
 * of these tests are about what that means when the same person comes back.
 */

const ID = "11111111-1111-4111-8111-111111111111";
const SECOND = "22222222-2222-4222-8222-222222222222";
const THIRD = "33333333-3333-4333-8333-333333333333";

const details = {
  name: "Andrea Santos",
  studentId: "2023-00182",
  email: "andrea.santos@umak.edu.ph",
  course: "BSCS",
  program: "BS Computer Science",
  section: "BSCS-2A",
};

beforeEach(() => {
  vi.clearAllMocks();
  $transaction.mockImplementation(async (handler: (tx: unknown) => Promise<unknown>) =>
    handler({ attendee: { findMany, create, update, updateMany } })
  );
});

afterEach(() => {
  vi.resetAllMocks();
});

test("adds a student who is not in the directory", async () => {
  findMany.mockResolvedValue([]);
  create.mockResolvedValue({ id: ID });

  const result = await createAttendee(details);

  expect(result).toEqual({ id: ID, restored: false });
  expect(create).toHaveBeenCalledWith({
    data: {
      name: "Andrea Santos",
      studentId: "2023-00182",
      // The identity column is derived from what was typed, never taken from the
      // caller, so the two can never drift apart.
      normalizedEmail: "andrea.santos@umak.edu.ph",
      displayEmail: "andrea.santos@umak.edu.ph",
      course: "BSCS",
      program: "BS Computer Science",
      section: "BSCS-2A",
    },
    select: { id: true },
  });
});

test("keeps the casing the organizer typed in the address", async () => {
  findMany.mockResolvedValue([]);
  create.mockResolvedValue({ id: ID });

  await createAttendee({ ...details, email: "Andrea.Santos@umak.edu.ph" });

  const { data } = create.mock.calls[0][0];

  // What the student sees in their email is what was typed; what identifies them is
  // the lowercase form.
  expect(data.displayEmail).toBe("Andrea.Santos@umak.edu.ph");
  expect(data.normalizedEmail).toBe("andrea.santos@umak.edu.ph");
});

test("refuses a student who is already in the directory", async () => {
  findMany.mockResolvedValue([{ id: ID, deletedAt: null }]);

  await expect(createAttendee(details)).rejects.toBeInstanceOf(AttendeeWriteError);
  expect(create).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});

test("brings back a removed student instead of failing on the unique values", async () => {
  findMany.mockResolvedValue([{ id: ID, deletedAt: new Date() }]);
  update.mockResolvedValue({ id: ID });

  const result = await createAttendee(details);

  // Creating a second row would collide on the email and the student number, leaving
  // the operator told a student number is taken by someone who is not in their list.
  expect(result).toEqual({ id: ID, restored: true });
  expect(create).not.toHaveBeenCalled();
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: ID },
      data: expect.objectContaining({ deletedAt: null }),
    })
  );
});

test("refuses when the email and the student number belong to two different people", async () => {
  // Both are present and neither is in the directory, so there is no single row this
  // could be. Restoring the wrong one would attach the attendance history to the
  // wrong student.
  findMany.mockResolvedValue([
    { id: ID, deletedAt: new Date() },
    { id: "22222222-2222-4222-8222-222222222222", deletedAt: new Date() },
  ]);

  await expect(createAttendee(details)).rejects.toThrow(/two different removed students/);
  expect(create).not.toHaveBeenCalled();
});

test("edits only the details that were sent", async () => {
  findUnique.mockResolvedValue({ id: ID, deletedAt: null });
  update.mockResolvedValue({ id: ID });

  await updateAttendee({ id: ID, changes: { course: "BSIT" } });

  // Not the whole record: sending every field would blank the ones the caller never
  // mentioned.
  expect(update).toHaveBeenCalledWith({
    where: { id: ID },
    data: { course: "BSIT" },
    select: { id: true },
  });
});

test("clears an optional detail when it is set to nothing", async () => {
  findUnique.mockResolvedValue({ id: ID, deletedAt: null });
  update.mockResolvedValue({ id: ID });

  await updateAttendee({ id: ID, changes: { section: null } });

  expect(update.mock.calls[0][0].data).toEqual({ section: null });
});

test("keeps the two email columns consistent when the address changes", async () => {
  findUnique.mockResolvedValue({ id: ID, deletedAt: null });
  findFirst.mockResolvedValue(null);
  update.mockResolvedValue({ id: ID });

  await updateAttendee({ id: ID, changes: { email: "New.Address@umak.edu.ph" } });

  expect(update.mock.calls[0][0].data).toEqual({
    displayEmail: "New.Address@umak.edu.ph",
    normalizedEmail: "new.address@umak.edu.ph",
  });
});

test("writes nothing when the edit changes no field", async () => {
  findUnique.mockResolvedValue({ id: ID, deletedAt: null });

  await expect(updateAttendee({ id: ID, changes: {} })).resolves.toEqual({ id: ID });
  expect(update).not.toHaveBeenCalled();
});

test("refuses to take an identity that belongs to somebody else", async () => {
  findUnique.mockResolvedValue({ id: ID, deletedAt: null });
  findFirst.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222" });

  // The database would refuse this too, but as an error the operator cannot act on.
  await expect(updateAttendee({ id: ID, changes: { studentId: "2023-99999" } })).rejects.toThrow(
    /already uses/,
  );
  expect(update).not.toHaveBeenCalled();
});

test("does not mistake a student for their own current identity", async () => {
  findUnique.mockResolvedValue({ id: ID, deletedAt: null });
  findFirst.mockResolvedValue(null);
  update.mockResolvedValue({ id: ID });

  await updateAttendee({ id: ID, changes: { studentId: "2023-00182" } });

  // Saving a record without changing it is the common case, and it must not report a
  // collision with itself.
  expect(findFirst.mock.calls[0][0].where).toMatchObject({ id: { not: ID } });
});

test("reports a student who is not in the directory", async () => {
  findUnique.mockResolvedValue(null);

  await expect(updateAttendee({ id: ID, changes: { name: "X" } })).rejects.toMatchObject({
    kind: "not_found",
  });
});

test("refuses to edit a student who has been removed", async () => {
  findUnique.mockResolvedValue({ id: ID, deletedAt: new Date() });

  // They are not in the directory, so there is nothing on screen to edit. Adding them
  // again is how they come back.
  await expect(updateAttendee({ id: ID, changes: { name: "X" } })).rejects.toThrow(
    /removed from the directory/,
  );
  expect(update).not.toHaveBeenCalled();
});

test("removing a student marks the record rather than erasing it", async () => {
  updateMany.mockResolvedValue({ count: 1 });

  const result = await softDeleteAttendee({ id: ID });

  expect(result).toEqual({ id: ID });
  // Never a delete: the roster entries and delivery history point at this row.
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: ID, deletedAt: null },
    data: { deletedAt: expect.any(Date) },
  });
});

test("reports a student who was already removed", async () => {
  updateMany.mockResolvedValue({ count: 0 });
  findUnique.mockResolvedValue({ deletedAt: new Date() });

  // Conditional on still being present, so removing twice says so rather than moving
  // a timestamp nobody can see.
  await expect(softDeleteAttendee({ id: ID })).rejects.toMatchObject({ kind: "not_found" });
});

test("reports a student who is not in the directory at all", async () => {
  updateMany.mockResolvedValue({ count: 0 });
  findUnique.mockResolvedValue(null);

  await expect(softDeleteAttendee({ id: ID })).rejects.toMatchObject({ kind: "not_found" });
});

test("removing several students marks them all in one statement", async () => {
  findMany.mockResolvedValue([
    { id: ID, deletedAt: null },
    { id: SECOND, deletedAt: null },
  ]);
  updateMany.mockResolvedValue({ count: 2 });

  const result = await removeAttendees({ ids: [ID, SECOND] });

  expect(result).toEqual({ removed: 2, alreadyRemoved: 0, unknownCount: 0, unknownIds: [] });
  // One statement, not a loop: fifty separate updates means fifty chances to stop part
  // way, and a bulk removal that did half of what was asked is worse than one that
  // did none.
  expect(updateMany).toHaveBeenCalledOnce();
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: { in: [ID, SECOND] }, deletedAt: null },
    data: { deletedAt: expect.any(Date) },
  });
});

test("reports which of a batch were already removed or unknown", async () => {
  findMany.mockResolvedValue([
    { id: ID, deletedAt: null },
    { id: SECOND, deletedAt: new Date() },
  ]);
  updateMany.mockResolvedValue({ count: 1 });

  const result = await removeAttendees({ ids: [ID, SECOND, THIRD] });

  // Re-running a partly applied selection has to be safe and honest about what it did.
  expect(result).toEqual({
    removed: 1,
    alreadyRemoved: 1,
    unknownCount: 1,
    unknownIds: [THIRD],
  });
  // Only the one that was actually there gets written.
  expect(updateMany.mock.calls[0][0].where).toMatchObject({ id: { in: [ID] } });
});

test("writes nothing when every student in the batch is already gone", async () => {
  findMany.mockResolvedValue([{ id: ID, deletedAt: new Date() }]);

  const result = await removeAttendees({ ids: [ID] });

  expect(updateMany).not.toHaveBeenCalled();
  expect(result).toMatchObject({ removed: 0, alreadyRemoved: 1 });
});

test("de-duplicates a batch before touching the database", async () => {
  findMany.mockResolvedValue([{ id: ID, deletedAt: null }]);
  updateMany.mockResolvedValue({ count: 1 });

  await removeAttendees({ ids: [ID, ID, ID] });

  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: { in: [ID] } } })
  );
});

test("rejects an empty or oversized batch", async () => {
  await expect(removeAttendees({ ids: [] })).rejects.toThrow("at least one student");

  const tooMany = Array.from({ length: MAX_REMOVE_BATCH + 1 }, (_, index) => `${index}`);
  await expect(removeAttendees({ ids: tooMany })).rejects.toThrow("at most");
});

test("importing a removed student brings them back", async () => {
  update.mockResolvedValue({ id: ID });

  await applyAttendeeImport({
    newAttendees: [],
    conflicts: [],
    updates: [
      {
        record: { row: 2, displayEmail: "andrea.santos@umak.edu.ph" },
        attendeeId: ID,
        matchedBy: "both",
        changes: [{ field: "course", current: "BSIT", proposed: "BSCS" }],
        isDeleted: true,
      } as never,
    ],
  });

  expect(update.mock.calls[0][0].data).toMatchObject({ deletedAt: null, course: "BSCS" });
});

test("a removed student whose details already match is still brought back", async () => {
  update.mockResolvedValue({ id: ID });

  await applyAttendeeImport({
    newAttendees: [],
    conflicts: [],
    updates: [
      {
        record: { row: 2, displayEmail: "andrea.santos@umak.edu.ph" },
        attendeeId: ID,
        matchedBy: "both",
        changes: [],
        isDeleted: true,
      } as never,
    ],
  });

  // No field changed, but the student is no longer in the directory, so the import is
  // a real change and has to be written.
  expect(update).toHaveBeenCalledOnce();
  expect(update.mock.calls[0][0].data).toEqual({ deletedAt: null });
});

test("an unchanged student in the directory is still not written", async () => {
  await applyAttendeeImport({
    newAttendees: [],
    conflicts: [],
    updates: [
      {
        record: { row: 2, displayEmail: "andrea.santos@umak.edu.ph" },
        attendeeId: ID,
        matchedBy: "both",
        changes: [],
        isDeleted: false,
      } as never,
    ],
  });

  // Writing would move updated_at for no reason, which makes the record look edited
  // when it was not.
  expect(update).not.toHaveBeenCalled();
});
