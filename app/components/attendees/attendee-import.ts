/**
 * Talks to the server-side import chain.
 *
 * The dialog used to parse, match and decide entirely in the browser, which meant
 * three copies of the same rules and a preview that could disagree with what the
 * commit then did. The server is now the only place those rules live: this module
 * sends the raw text and shows what comes back.
 *
 * The commit route re-derives the preview from the text and ignores anything the
 * browser claims, so what is approved here is a set of row numbers, not a set of
 * values.
 */

export type ImportMode = "csv" | "paste";

/**
 * What the operator chose for one row that matches a student already on file.
 *
 * There is no third option: a row the server cannot apply has no decision to make,
 * which is why the conflict review shows those rows as a reason rather than a choice.
 */
export type RowDecision = "useIncoming" | "keepSaved";

/** Taking the list's value is the default, since that is why the row was flagged. */
export function defaultDecision(): RowDecision {
  return "useIncoming";
}

/**
 * The row numbers to send to the commit route.
 *
 * Only rows the preview listed as approvable are ever considered, so a conflict or
 * an unreadable row cannot be smuggled in by a stale decision. New students are
 * always taken. An update is taken unless the operator chose to keep the saved
 * version.
 *
 * The commit route rebuilds the preview from the text and ignores everything but
 * these numbers, so this is the whole of the operator's influence on what is written.
 */
export function approvedRowsFor(
  preview: ImportPreview,
  decisions: Record<number, RowDecision>
): number[] {
  const updatesByRow = new Map(preview.preview.updates.map((update) => [update.record.row, update]));

  return preview.approvableRows.filter((row) => {
    const update = updatesByRow.get(row);
    if (!update) return true;

    return (decisions[row] ?? defaultDecision()) === "useIncoming";
  });
}

/** What the operator has chosen so far, in the form the confirm button counts. */
export function pendingCountFor(
  preview: ImportPreview,
  decisions: Record<number, RowDecision>
): number {
  return approvedRowsFor(preview, decisions).length;
}

export type ImportField = "name" | "displayEmail" | "studentId" | "course" | "program" | "section";

export type ImportedRecord = {
  row: number;
  name: string | null;
  studentId: string | null;
  course: string | null;
  program: string | null;
  section: string | null;
  normalizedEmail: string;
  displayEmail: string;
};

export type ExistingAttendee = {
  id: string;
  name: string;
  studentId: string;
  normalizedEmail: string;
  displayEmail: string;
  course: string | null;
  program: string | null;
  section: string | null;
};

export type ImportPreview = {
  mode: ImportMode;
  summary: {
    parsed: number;
    malformed: number;
    newCount: number;
    updateCount: number;
    conflictCount: number;
    withheldCount: number;
  };
  errors: { row: number; field: string; message: string }[];
  preview: {
    newAttendees: ImportedRecord[];
    updates: {
      record: ImportedRecord;
      attendeeId: string;
      matchedBy: "studentId" | "email" | "both";
      changes: { field: ImportField; current: string | null; proposed: string | null }[];
    }[];
    conflicts: {
      record: ImportedRecord;
      reason: "duplicate_in_import" | "matches_multiple_attendees";
      message: string;
      existing: ExistingAttendee | null;
      candidates: ExistingAttendee[];
    }[];
  };
  /**
   * Rows the import will not act on, and why.
   *
   * A pasted address that matches nobody lands here rather than in the conflicts:
   * a paste can only change students who are already on file, so there is nothing
   * to decide and nothing to write.
   */
  withheld: { row: number; reason: string; message: string }[];
  /** Every row the browser is allowed to approve. */
  approvableRows: number[];
};

export type ImportCommitResult = {
  created: number;
  updated: number;
  skipped: number;
  unapplied: { record: ImportedRecord; reason: string; message: string }[];
  withheld: { row: number; reason: string; message: string }[];
};

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

export async function previewImport({
  mode,
  content,
  signal,
}: {
  mode: ImportMode;
  content: string;
  signal?: AbortSignal;
}): Promise<ImportPreview> {
  const response = await fetch("/api/attendees/import/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, content }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readError(response, "That list could not be read. Check the format."));
  }

  return (await response.json()) as ImportPreview;
}

export async function commitImport({
  mode,
  content,
  approvedRows,
  signal,
}: {
  mode: ImportMode;
  content: string;
  approvedRows: number[];
  signal?: AbortSignal;
}): Promise<ImportCommitResult> {
  const response = await fetch("/api/attendees/import/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, content, approvedRows }),
    signal,
  });

  if (!response.ok) {
    throw new Error(
      await readError(response, "Those students could not be imported. Try again."),
    );
  }

  return (await response.json()) as ImportCommitResult;
}
