import { afterEach, expect, test, vi } from "vitest";

const { create, update, transaction } = vi.hoisted(() => {
  const attendee = { create: vi.fn(), update: vi.fn() };
  const run = vi.fn();

  return { create: attendee.create, update: attendee.update, transaction: run };
});

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ $transaction: transaction }),
}));

import { applyAttendeeImport } from "@/lib/services/attendee-service";
import type { ConflictPreview } from "@/lib/services/ingestion/conflict-service";
import type { IngestionRecord } from "@/lib/services/ingestion/parser";

function record(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  const displayEmail = overrides.displayEmail ?? "new@example.com";

  return {
    row: 1,
    name: null,
    studentId: null,
    course: null,
    program: null,
    section: null,
    displayEmail,
    normalizedEmail: displayEmail.toLowerCase(),
    ...overrides,
  };
}

function preview(overrides: Partial<ConflictPreview> = {}): ConflictPreview {
  return { newAttendees: [], updates: [], conflicts: [], ...overrides };
}

function runTransaction() {
  transaction.mockImplementation(async (callback) =>
    callback({ attendee: { create, update } }),
  );
}

afterEach(() => {
  vi.resetAllMocks();
  runTransaction();
});

test("runs the whole import inside one transaction", async () => {
  update.mockResolvedValue({ id: "attendee-1" });
  create.mockResolvedValue({ id: "attendee-2" });

  await applyAttendeeImport(
    preview({
      updates: [
        {
          record: record(),
          attendeeId: "attendee-1",
          matchedBy: "email",
          changes: [{ field: "name", current: "Old", proposed: "New" }],
        },
      ],
      newAttendees: [record({ studentId: "2023-9" })],
    }),
  );

  expect(transaction).toHaveBeenCalledTimes(1);
});

test("updates by the existing UUID so roster-entry references survive", async () => {
  update.mockResolvedValue({ id: "attendee-1" });

  const result = await applyAttendeeImport(
    preview({
      updates: [
        {
          record: record(),
          attendeeId: "attendee-1",
          matchedBy: "studentId",
          changes: [
            { field: "name", current: "Old Name", proposed: "New Name" },
            { field: "studentId", current: "2023-1", proposed: "2023-2" },
          ],
        },
      ],
    }),
  );

  expect(update).toHaveBeenCalledWith({
    where: { id: "attendee-1" },
    data: { name: "New Name", studentId: "2023-2" },
    select: { id: true },
  });
  expect(result.updatedIds).toEqual(["attendee-1"]);
  expect(result.createdIds).toEqual([]);
});

test("applies a changed course and program", async () => {
  update.mockResolvedValue({ id: "attendee-1" });

  await applyAttendeeImport(
    preview({
      updates: [
        {
          record: record(),
          attendeeId: "attendee-1",
          matchedBy: "studentId",
          changes: [
            { field: "course", current: "BSIT", proposed: "BSCS" },
            { field: "program", current: "BS Information Technology", proposed: "BS Computer Science" },
          ],
        },
      ],
    }),
  );

  expect(update).toHaveBeenCalledWith({
    where: { id: "attendee-1" },
    data: { course: "BSCS", program: "BS Computer Science" },
    select: { id: true },
  });
});

test("applies a changed section", async () => {
  update.mockResolvedValue({ id: "attendee-1" });

  await applyAttendeeImport(
    preview({
      updates: [
        {
          record: record(),
          attendeeId: "attendee-1",
          matchedBy: "studentId",
          changes: [{ field: "section", current: "BSIT-1A", proposed: "BSIT-2A" }],
        },
      ],
    }),
  );

  expect(update).toHaveBeenCalledWith({
    where: { id: "attendee-1" },
    data: { section: "BSIT-2A" },
    select: { id: true },
  });
});

test("stores the course, program and section of a newly created attendee", async () => {
  create.mockResolvedValue({ id: "attendee-new" });

  await applyAttendeeImport(
    preview({
      newAttendees: [
        record({
          row: 1,
          name: "Ana Reyes",
          studentId: "2023-4",
          displayEmail: "Ana@Example.com",
          normalizedEmail: "ana@example.com",
          course: "BSINS",
          program: "BS Information Systems",
          section: "BSINS-1B",
        }),
      ],
    }),
  );

  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        course: "BSINS",
        program: "BS Information Systems",
        section: "BSINS-1B",
      }),
    })
  );
});

test("recomputes the normalized email whenever the display email changes", async () => {
  update.mockResolvedValue({ id: "attendee-1" });

  await applyAttendeeImport(
    preview({
      updates: [
        {
          record: record(),
          attendeeId: "attendee-1",
          matchedBy: "studentId",
          changes: [
            {
              field: "displayEmail",
              current: "old@example.com",
              proposed: "  New.Address@Example.COM  ",
            },
          ],
        },
      ],
    }),
  );

  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        displayEmail: "  New.Address@Example.COM  ",
        normalizedEmail: "new.address@example.com",
      },
    }),
  );
});

test("skips the write when the record already matches", async () => {
  const result = await applyAttendeeImport(
    preview({
      updates: [
        {
          record: record(),
          attendeeId: "attendee-1",
          matchedBy: "both",
          changes: [],
        },
      ],
    }),
  );

  expect(update).not.toHaveBeenCalled();
  expect(result.updatedIds).toEqual(["attendee-1"]);
});

test("creates new attendees with both email columns", async () => {
  create.mockResolvedValue({ id: "attendee-new" });

  const result = await applyAttendeeImport(
    preview({
      newAttendees: [
        record({
          row: 4,
          name: "Ana Reyes",
          studentId: "2023-4",
          displayEmail: "Ana@Example.com",
          normalizedEmail: "ana@example.com",
        }),
      ],
    }),
  );

  expect(create).toHaveBeenCalledWith({
    data: {
      name: "Ana Reyes",
      studentId: "2023-4",
      normalizedEmail: "ana@example.com",
      displayEmail: "Ana@Example.com",
      course: null,
      program: null,
      section: null,
    },
    select: { id: true },
  });
  expect(result.createdIds).toEqual(["attendee-new"]);
});

test("falls back to the display email when a new row has no name", async () => {
  create.mockResolvedValue({ id: "attendee-new" });

  await applyAttendeeImport(
    preview({ newAttendees: [record({ studentId: "2023-5" })] }),
  );

  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ name: "new@example.com" }) }),
  );
});

test("never writes a conflicted row", async () => {
  const result = await applyAttendeeImport(
    preview({
      conflicts: [
        {
          record: record({ row: 7 }),
          reason: "matches_multiple_attendees",
          message: "Student ID and email belong to different attendees.",
          existing: null,
          candidates: [],
        },
      ],
    }),
  );

  expect(create).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
  expect(result.unapplied).toEqual([
    {
      record: expect.objectContaining({ row: 7 }),
      reason: "conflict",
      message: "Student ID and email belong to different attendees.",
    },
  ]);
});

test("reports a new row with no student ID instead of failing the import", async () => {
  create.mockResolvedValue({ id: "attendee-new" });

  const result = await applyAttendeeImport(
    preview({
      newAttendees: [
        record({ row: 2, displayEmail: "a@example.com" }),
        record({ row: 3, studentId: "2023-3", displayEmail: "b@example.com" }),
      ],
    }),
  );

  expect(create).toHaveBeenCalledTimes(1);
  expect(result.createdIds).toEqual(["attendee-new"]);
  expect(result.unapplied).toHaveLength(1);
  expect(result.unapplied[0]).toMatchObject({
    reason: "missing_student_id",
  });
  expect(result.unapplied[0].message).toContain("Row 2");
});

test("leaves a null proposed value untouched rather than clearing the field", async () => {
  update.mockResolvedValue({ id: "attendee-1" });

  await applyAttendeeImport(
    preview({
      updates: [
        {
          record: record(),
          attendeeId: "attendee-1",
          matchedBy: "email",
          changes: [{ field: "name", current: "Kept", proposed: null }],
        },
      ],
    }),
  );

  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ data: {} }),
  );
});
