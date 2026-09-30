import { afterEach, expect, test, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ attendee: { findMany } }),
}));

import { previewAttendeeConflicts } from "@/lib/services/ingestion/conflict-service";
import type { IngestionRecord } from "@/lib/services/ingestion/parser";

function record({ row, ...rest }: Partial<IngestionRecord> & { row: number }): IngestionRecord {
  const displayEmail = rest.displayEmail ?? `${row}@example.com`;

  return {
    row,
    name: null,
    studentId: null,
    course: null,
    program: null,
    section: null,
    displayEmail,
    normalizedEmail: displayEmail.toLowerCase(),
    ...rest,
  };
}

function attendee(overrides: Partial<Record<string, string | null>> = {}) {
  return {
    id: "attendee-1",
    name: "Existing Name",
    studentId: "2023-1",
    normalizedEmail: "existing@example.com",
    displayEmail: "existing@example.com",
    course: null,
    program: null,
    ...overrides,
  };
}

function returns(...rows: ReturnType<typeof attendee>[]) {
  findMany.mockResolvedValue(rows);
}

afterEach(() => {
  vi.resetAllMocks();
});

test("reports a changed course as a change", async () => {
  returns(attendee({ course: "BSIT" }));

  const { updates } = await previewAttendeeConflicts([
    record({
      row: 1,
      name: "Existing Name",
      studentId: "2023-1",
      displayEmail: "existing@example.com",
      course: "BSCS",
    }),
  ]);

  expect(updates[0].changes).toEqual([{ field: "course", current: "BSIT", proposed: "BSCS" }]);
});

test("reports a changed program as a change", async () => {
  returns(attendee({ program: "BS Information Technology" }));

  const { updates } = await previewAttendeeConflicts([
    record({
      row: 1,
      name: "Existing Name",
      studentId: "2023-1",
      displayEmail: "existing@example.com",
      program: "BS Computer Science",
    }),
  ]);

  expect(updates[0].changes).toEqual([
    { field: "program", current: "BS Information Technology", proposed: "BS Computer Science" },
  ]);
});

test("does not report a course change when the import carried no course", async () => {
  returns(attendee({ course: "BSIT" }));

  // A CSV with no course column must not offer to blank every existing course,
  // which is what a naive null-vs-value diff would do.
  const { updates } = await previewAttendeeConflicts([
    record({
      row: 1,
      name: "Existing Name",
      studentId: "2023-1",
      displayEmail: "existing@example.com",
    }),
  ]);

  expect(updates[0].changes).toEqual([]);
});

test("does not report a change when the course already matches", async () => {
  returns(attendee({ course: "BSIT", program: "BS Information Technology" }));

  const { updates } = await previewAttendeeConflicts([
    record({
      row: 1,
      name: "Existing Name",
      studentId: "2023-1",
      displayEmail: "existing@example.com",
      course: "BSIT",
      program: "BS Information Technology",
    }),
  ]);

  expect(updates[0].changes).toEqual([]);
});

test("reports a changed section as a change", async () => {
  returns(attendee({ section: "BSIT-1A" }));

  const { updates } = await previewAttendeeConflicts([
    record({
      row: 1,
      name: "Existing Name",
      studentId: "2023-1",
      displayEmail: "existing@example.com",
      section: "BSIT-2A",
    }),
  ]);

  expect(updates[0].changes).toEqual([
    { field: "section", current: "BSIT-1A", proposed: "BSIT-2A" },
  ]);
});

test("does not report a section change when the import carried none", async () => {
  returns(attendee({ section: "BSIT-1A" }));

  // Otherwise a CSV with no section column would offer to blank every section.
  const { updates } = await previewAttendeeConflicts([
    record({
      row: 1,
      name: "Existing Name",
      studentId: "2023-1",
      displayEmail: "existing@example.com",
    }),
  ]);

  expect(updates[0].changes).toEqual([]);
});

test("carries the existing record on a duplicate within the import", async () => {
  returns(attendee({ id: "att-1", displayEmail: "ada@example.com" }));

  // The review renders a side-by-side, so the left column has to come from here.
  const { conflicts } = await previewAttendeeConflicts([
    record({ row: 1, studentId: "2023-1", displayEmail: "ada@example.com" }),
    record({ row: 2, studentId: "2023-1", displayEmail: "ada@example.com" }),
  ]);

  expect(conflicts[0].existing).toMatchObject({
    id: "att-1",
    displayEmail: "ada@example.com",
  });
  expect(conflicts[0].candidates).toEqual([]);
});

test("carries no existing record when the collision is inside the import", async () => {
  returns();

  // Nothing is on file, so there is no left-hand side to show.
  const { conflicts } = await previewAttendeeConflicts([
    record({ row: 1, studentId: "2023-1", displayEmail: "a@example.com" }),
    record({ row: 2, studentId: "2023-1", displayEmail: "b@example.com" }),
  ]);

  expect(conflicts[0].existing).toBeNull();
  expect(conflicts[0].candidates).toEqual([]);
});

test("carries both candidates when a row matches two different people", async () => {
  // One row: its student ID belongs to Andrea and its email to Ben. Applying it
  // would rewrite one and collide with the other.
  returns(
    attendee({ id: "att-1", studentId: "2023-1", normalizedEmail: "andrea@example.com", displayEmail: "andrea@example.com" }),
    attendee({ id: "att-2", studentId: "2023-2", normalizedEmail: "ben@example.com", displayEmail: "ben@example.com" }),
  );

  // Resolving this needs seeing them; the message alone does not say which two.
  const { conflicts } = await previewAttendeeConflicts([
    record({ row: 1, studentId: "2023-1", displayEmail: "ben@example.com" }),
  ]);

  expect(conflicts[0].reason).toBe("matches_multiple_attendees");
  expect(conflicts[0].existing).toBeNull();
  expect(conflicts[0].candidates.map((c) => c.id).sort()).toEqual(["att-1", "att-2"]);
});

test("selects course, program and section from the database", async () => {
  returns();

  await previewAttendeeConflicts([record({ row: 1, studentId: "2023-1" })]);

  // The diff reads the current values, so the columns have to be selected.
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      select: expect.objectContaining({ course: true, program: true, section: true }),
    })
  );
});

test("returns empty results and skips the query for an empty import", async () => {
  await expect(previewAttendeeConflicts([])).resolves.toEqual({
    newAttendees: [],
    updates: [],
    conflicts: [],
  });

  expect(findMany).not.toHaveBeenCalled();
});

test("treats unmatched rows as new attendees", async () => {
  returns();

  const rows = [
    record({ row: 1, name: "Ana", studentId: "2023-1" }),
    record({ row: 2, name: "Ben", studentId: "2023-2" }),
  ];

  const preview = await previewAttendeeConflicts(rows);

  expect(preview.newAttendees).toEqual(rows);
  expect(preview.updates).toEqual([]);
  expect(preview.conflicts).toEqual([]);
});

test("queries by student ID or normalized email in one round trip", async () => {
  returns();

  await previewAttendeeConflicts([
    record({ row: 1, studentId: "2023-1" }),
    record({ row: 2, displayEmail: "Second@Example.com" }),
  ]);

  expect(findMany).toHaveBeenCalledTimes(1);
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        OR: [
          { studentId: { in: ["2023-1"] } },
          { normalizedEmail: { in: ["1@example.com", "second@example.com"] } },
        ],
      },
    }),
  );
});

test("previews an update when a row matches on student ID", async () => {
  returns(attendee());

  const preview = await previewAttendeeConflicts([
    record({
      row: 1,
      name: "Corrected Name",
      studentId: "2023-1",
      // Deliberately not the existing attendee's address, so only the student
      // ID matches.
      displayEmail: "new-address@example.com",
    }),
  ]);

  expect(preview.newAttendees).toEqual([]);
  expect(preview.updates).toEqual([
    {
      record: expect.objectContaining({ row: 1, name: "Corrected Name" }),
      attendeeId: "attendee-1",
      matchedBy: "studentId",
      changes: [
        { field: "name", current: "Existing Name", proposed: "Corrected Name" },
        {
          field: "displayEmail",
          current: "existing@example.com",
          proposed: "new-address@example.com",
        },
      ],
    },
  ]);
});

test("previews an update when a row matches on normalized email", async () => {
  returns(attendee());

  const preview = await previewAttendeeConflicts([
    record({ row: 1, displayEmail: "EXISTING@example.com" }),
  ]);

  expect(preview.updates[0]).toMatchObject({ attendeeId: "attendee-1", matchedBy: "email" });
  expect(preview.updates[0].changes).toEqual([
    {
      field: "displayEmail",
      current: "existing@example.com",
      proposed: "EXISTING@example.com",
    },
  ]);
});

test("reports both when the student ID and email resolve to the same attendee", async () => {
  returns(attendee());

  const preview = await previewAttendeeConflicts([
    record({ row: 1, studentId: "2023-1", displayEmail: "existing@example.com" }),
  ]);

  expect(preview.updates[0].matchedBy).toBe("both");
  expect(preview.updates[0].changes).toEqual([]);
});

test("omits attributes that are absent or unchanged", async () => {
  returns(attendee());

  const preview = await previewAttendeeConflicts([
    record({ row: 1, displayEmail: "existing@example.com" }),
  ]);

  expect(preview.updates[0].changes).toEqual([]);
});

test("flags a row whose student ID and email belong to different attendees", async () => {
  returns(
    attendee({ id: "a", studentId: "2023-1", displayEmail: "a@example.com" }),
    attendee({
      id: "b",
      studentId: "2023-2",
      normalizedEmail: "b@example.com",
      displayEmail: "b@example.com",
    }),
  );

  const preview = await previewAttendeeConflicts([
    record({ row: 1, studentId: "2023-1", displayEmail: "b@example.com" }),
  ]);

  expect(preview.updates).toEqual([]);
  expect(preview.newAttendees).toEqual([]);
  expect(preview.conflicts).toHaveLength(1);
  expect(preview.conflicts[0]).toMatchObject({
    reason: "matches_multiple_attendees",
  });
  expect(preview.conflicts[0].message).toContain("2023-1");
  expect(preview.conflicts[0].message).toContain("b@example.com");
});

test("flags a second row that matches the same existing attendee", async () => {
  returns(attendee());

  const preview = await previewAttendeeConflicts([
    record({ row: 1, studentId: "2023-1" }),
    record({ row: 2, studentId: "2023-1" }),
  ]);

  expect(preview.updates).toHaveLength(1);
  expect(preview.conflicts).toHaveLength(1);
  expect(preview.conflicts[0]).toMatchObject({
    record: expect.objectContaining({ row: 2 }),
    reason: "duplicate_in_import",
  });
});

test("flags two new rows colliding on the same student ID", async () => {
  returns();

  const preview = await previewAttendeeConflicts([
    record({ row: 1, studentId: "2023-1" }),
    record({ row: 2, studentId: "2023-1" }),
  ]);

  expect(preview.newAttendees).toHaveLength(1);
  expect(preview.conflicts).toHaveLength(1);
  expect(preview.conflicts[0].message).toContain("student ID 2023-1");
});

test("flags two new rows colliding on the same email regardless of case", async () => {
  returns();

  const preview = await previewAttendeeConflicts([
    record({ row: 1, displayEmail: "same@example.com" }),
    record({ row: 2, displayEmail: "SAME@example.com" }),
  ]);

  expect(preview.newAttendees).toHaveLength(1);
  expect(preview.conflicts).toHaveLength(1);
  expect(preview.conflicts[0].message).toContain("SAME@example.com");
});

test("keeps processing after a conflicting row", async () => {
  returns();

  const preview = await previewAttendeeConflicts([
    record({ row: 1, studentId: "2023-1" }),
    record({ row: 2, studentId: "2023-1" }),
    record({ row: 3, studentId: "2023-3" }),
  ]);

  expect(preview.newAttendees.map((row) => row.row)).toEqual([1, 3]);
  expect(preview.conflicts.map((conflict) => conflict.record.row)).toEqual([2]);
});
