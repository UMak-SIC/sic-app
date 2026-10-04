import { afterEach, expect, test, vi } from "vitest";

const { previewAttendeeConflicts, parseCsv, parsePastedRecipients } = vi.hoisted(() => ({
  previewAttendeeConflicts: vi.fn(),
  parseCsv: vi.fn(),
  parsePastedRecipients: vi.fn(),
}));

vi.mock("@/lib/services/ingestion/conflict-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/services/ingestion/conflict-service")
  >();
  return { ...actual, previewAttendeeConflicts };
});

vi.mock("@/lib/services/ingestion/parser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/ingestion/parser")>();
  return { ...actual, parseCsv, parsePastedRecipients };
});

import {
  buildImportPreview,
  filterPreviewToRows,
  readApprovedRows,
  readImportSource,
  MAX_IMPORT_CHARACTERS,
} from "@/lib/services/ingestion/import-request";
import type { ConflictPreview } from "@/lib/services/ingestion/conflict-service";
import type { IngestionRecord } from "@/lib/services/ingestion/parser";

function record(row: number, overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    row,
    name: "Ada Lovelace",
    studentId: `S-${row}`,
    course: null,
    program: null,
    section: null,
    normalizedEmail: `person${row}@example.com`,
    displayEmail: `person${row}@example.com`,
    ...overrides,
  };
}

function preview(overrides: Partial<ConflictPreview> = {}): ConflictPreview {
  return { newAttendees: [], updates: [], conflicts: [], ...overrides };
}

const update = (row: number) => ({
  record: record(row),
  attendeeId: `attendee-${row}`,
  matchedBy: "studentId" as const,
  changes: [],
  isDeleted: false,
});

afterEach(() => {
  vi.resetAllMocks();
});

test("reads a csv source", () => {
  const source = readImportSource({ mode: "csv", content: "name,email" });

  expect(source).toEqual({ ok: true, mode: "csv", content: "name,email" });
});

test("rejects a body that does not say which kind of list it is", () => {
  expect(readImportSource({ content: "a@b.com" }).ok).toBe(false);
  expect(readImportSource({ mode: "text", content: "a@b.com" }).ok).toBe(false);
  expect(readImportSource(null).ok).toBe(false);
  expect(readImportSource("a@b.com").ok).toBe(false);
});

test("rejects an empty list and an oversized one", () => {
  expect(readImportSource({ mode: "paste", content: "   " }).ok).toBe(false);
  expect(
    readImportSource({ mode: "csv", content: "x".repeat(MAX_IMPORT_CHARACTERS + 1) }).ok
  ).toBe(false);
});

test("routes a source to the matching parser", async () => {
  parseCsv.mockReturnValue({ records: [], errors: [] });
  previewAttendeeConflicts.mockResolvedValue(preview());

  await buildImportPreview({ mode: "csv", content: "name,email" });

  expect(parseCsv).toHaveBeenCalledWith("name,email");
  expect(parsePastedRecipients).not.toHaveBeenCalled();
});

test("a paste cannot create an attendee, and says so in plain language", async () => {
  const newRecord = record(2);
  parsePastedRecipients.mockReturnValue({ records: [newRecord], errors: [] });
  previewAttendeeConflicts.mockResolvedValue(
    preview({ newAttendees: [newRecord], updates: [update(3)] })
  );

  const result = await buildImportPreview({
    mode: "paste",
    content: "newcomer@example.com",
  });

  // #88: pasted input only resolves against attendees who already exist.
  expect(result.preview.newAttendees).toEqual([]);
  expect(result.preview.updates).toHaveLength(1);
  expect(result.withheld).toEqual([
    {
      row: 2,
      reason: "paste_cannot_create",
      message:
        "This address is not on your attendee list yet. Upload a spreadsheet to add new attendees.",
    },
  ]);
  // The wording avoids backend terms on purpose.
  expect(result.withheld[0].message).not.toMatch(/attendee_id|insert|row insert/i);
});

test("a csv can create an attendee", async () => {
  const newRecord = record(2);
  parseCsv.mockReturnValue({ records: [newRecord], errors: [] });
  previewAttendeeConflicts.mockResolvedValue(preview({ newAttendees: [newRecord] }));

  const result = await buildImportPreview({ mode: "csv", content: "name,email" });

  expect(result.preview.newAttendees).toHaveLength(1);
  expect(result.withheld).toEqual([]);
});

test("approving one row cannot widen into another", () => {
  const scoped = filterPreviewToRows(
    preview({
      newAttendees: [record(1), record(2)],
      updates: [update(3), update(4)],
    }),
    [2]
  );

  expect(scoped.newAttendees.map((r) => r.row)).toEqual([2]);
  expect(scoped.updates.map((u) => u.record.row)).toEqual([]);
});

test("approving nothing yields a preview with nothing in it", () => {
  const scoped = filterPreviewToRows(preview({ newAttendees: [record(1)] }), []);

  expect(scoped.newAttendees).toEqual([]);
  expect(scoped.updates).toEqual([]);
  expect(scoped.conflicts).toEqual([]);
});

test("approved rows must be a list of numbers", () => {
  expect(readApprovedRows({ approvedRows: [1, 2, 2] })).toEqual([1, 2]);
  expect(readApprovedRows({ approvedRows: [] })).toEqual([]);
  expect(readApprovedRows({ approvedRows: ["1"] })).toBeNull();
  expect(readApprovedRows({ approvedRows: 1 })).toBeNull();
  // Absent is distinct from empty: absent means the browser never chose.
  expect(readApprovedRows({})).toBeNull();
});
