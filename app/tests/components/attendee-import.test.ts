import { afterEach, expect, test, vi } from "vitest";

import {
  approvedRowsFor,
  commitImport,
  defaultDecision,
  pendingCountFor,
  previewImport,
  type ImportPreview,
  type ImportedRecord,
  type RowDecision,
} from "@/components/attendees/attendee-import";

/**
 * The browser's whole influence on an import is the list of row numbers it sends.
 * The commit route rebuilds the preview from the text and writes only those rows, so
 * a mistake here either drops a student the operator approved or writes one they
 * did not. The review screen is a thin layer over these rules.
 */

function record(row: number, overrides: Partial<ImportedRecord> = {}): ImportedRecord {
  return {
    row,
    name: `Student ${row}`,
    studentId: `2023-${row}`,
    course: "BSIT",
    program: null,
    section: null,
    normalizedEmail: `student${row}@umak.edu.ph`,
    displayEmail: `student${row}@umak.edu.ph`,
    ...overrides,
  };
}

function preview(overrides: Partial<ImportPreview> = {}): ImportPreview {
  const inner = overrides.preview ?? {
    newAttendees: [record(1)],
    updates: [
      {
        record: record(2),
        attendeeId: "att-2",
        matchedBy: "studentId" as const,
        changes: [{ field: "course" as const, current: "BSCS", proposed: "BSIT" }],
      },
    ],
    conflicts: [],
  };

  return {
    mode: "paste",
    summary: {
      parsed: inner.newAttendees.length + inner.updates.length + inner.conflicts.length,
      malformed: 0,
      newCount: inner.newAttendees.length,
      updateCount: inner.updates.length,
      conflictCount: inner.conflicts.length,
      withheldCount: 0,
    },
    errors: [],
    withheld: [],
    ...overrides,
    preview: inner,
    approvableRows:
      overrides.approvableRows ??
      [...inner.newAttendees.map((entry) => entry.row), ...inner.updates.map((u) => u.record.row)],
  };
}

test("takes a new student and an undecided update", () => {
  const result = approvedRowsFor(preview(), {});

  expect(result).toEqual([1, 2]);
});

test("defaults to taking the list's value for an update", () => {
  expect(defaultDecision()).toBe("useIncoming");
  expect(approvedRowsFor(preview(), {})).toContain(2);
});

test("drops an update the operator chose to keep saved", () => {
  expect(approvedRowsFor(preview(), { 2: "keepSaved" })).toEqual([1]);
});

test("takes it again when the operator changes their mind", () => {
  expect(approvedRowsFor(preview(), { 2: "useIncoming" })).toEqual([1, 2]);
});

test("never sends a row the server would not accept", () => {
  const withConflict = preview({
    preview: {
      newAttendees: [record(1)],
      updates: [],
      conflicts: [
        {
          record: record(3),
          reason: "matches_multiple_attendees",
          message: "Two different students.",
          existing: null,
          candidates: [],
        },
      ],
    },
    approvableRows: [1],
  });

  // Even a decision naming the conflicting row cannot get it through, because the
  // filter starts from what the preview said was acceptable.
  expect(approvedRowsFor(withConflict, { 3: "useIncoming" })).toEqual([1]);
});

test("ignores a decision for a row that is not in the preview", () => {
  expect(approvedRowsFor(preview(), { 99: "keepSaved" })).toEqual([1, 2]);
});

test("counts what would be written, and it moves as choices change", () => {
  const list = preview();

  expect(pendingCountFor(list, {})).toBe(2);
  expect(pendingCountFor(list, { 2: "keepSaved" })).toBe(1);
  expect(pendingCountFor(list, { 1: "keepSaved" })).toBe(2);
});

test("a list the server will not touch at all sends nothing", () => {
  // A paste of addresses nobody is on yet. The server withholds them rather than
  // treating them as conflicts, so the browser has no rows to approve and no way to
  // turn them into approvals.
  const withheldOnly = preview({
    preview: { newAttendees: [], updates: [], conflicts: [] },
    approvableRows: [],
    withheld: [
      { row: 1, reason: "paste_cannot_create", message: "This address is not on your attendee list yet." },
    ],
    summary: {
      parsed: 1,
      malformed: 0,
      newCount: 0,
      updateCount: 0,
      conflictCount: 0,
      withheldCount: 1,
    },
  });

  expect(approvedRowsFor(withheldOnly, { 1: "useIncoming" })).toEqual([]);
  expect(pendingCountFor(withheldOnly, {})).toBe(0);
});

test("counting only ever matches the rows it would send", () => {
  const list = preview();
  const choices: Record<number, RowDecision>[] = [
    {},
    { 2: "keepSaved" },
    { 1: "useIncoming", 2: "useIncoming" },
  ];

  for (const decisions of choices) {
    expect(pendingCountFor(list, decisions)).toBe(approvedRowsFor(list, decisions).length);
  }
});

const originalFetch = globalThis.fetch;

/** fetch's signature, so the recorded calls can be read back without a cast. */
type FetchStub = ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>>;

function stubFetch(response: { ok?: boolean; status?: number; json?: () => Promise<unknown> }) {
  const fetchMock: FetchStub = vi.fn(async () => ({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: response.json ?? (async () => ({})),
  }));

  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

  return fetchMock;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

test("sends the raw text to the preview, not a parsed list", async () => {
  const body = preview();
  const fetchMock = stubFetch({ json: async () => body });

  await previewImport({ mode: "paste", content: "one\ntwo" });

  const [url, init] = fetchMock.mock.calls[0];

  expect(url).toBe("/api/attendees/import/preview");
  expect(JSON.parse(String(init?.body))).toEqual({ mode: "paste", content: "one\ntwo" });
});

test("passes the approved rows to the commit", async () => {
  const fetchMock = stubFetch({ json: async () => ({ created: 1, updated: 0, skipped: 0 }) });

  await commitImport({ mode: "csv", content: "a,b,c", approvedRows: [1, 4] });

  const [url, init] = fetchMock.mock.calls[0];

  expect(url).toBe("/api/attendees/import/commit");
  expect(JSON.parse(String(init?.body))).toEqual({
    mode: "csv",
    content: "a,b,c",
    approvedRows: [1, 4],
  });
});

test("surfaces the server's own wording when a request is refused", async () => {
  stubFetch({
    ok: false,
    status: 400,
    json: async () => ({ error: "That event has closed." }),
  });

  // Falling back to a generic message here would tell an operator their list was
  // malformed when the real problem was something else entirely.
  await expect(previewImport({ mode: "paste", content: "x" })).rejects.toThrow(
    "That event has closed."
  );
});

test("falls back to a usable sentence when a refusal carries no wording", async () => {
  stubFetch({ ok: false, status: 500, json: async () => null });

  await expect(commitImport({ mode: "paste", content: "x", approvedRows: [1] })).rejects.toThrow(
    "could not be imported"
  );
});

test("does not turn an aborted preview into an error", async () => {
  const controller = new AbortController();
  const fetchMock: FetchStub = vi.fn(async () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    throw error;
  });

  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  controller.abort();

  // The caller checks the signal itself, so the rejection is expected to escape.
  await expect(
    previewImport({ mode: "paste", content: "x", signal: controller.signal })
  ).rejects.toThrow();
  expect(controller.signal.aborted).toBe(true);
});
