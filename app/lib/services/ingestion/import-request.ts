import { parseCsv, parsePastedRecipients, type ParseResult } from "./parser";
import { previewAttendeeConflicts, type ConflictPreview } from "./conflict-service";
import type { IngestionRecord } from "./parser";

/**
 * Shared request handling for the two attendee import routes.
 *
 * Both routes need the same three steps, and both have to agree on them. In
 * particular the commit route must never trust a preview sent by the browser,
 * because the preview is the authorization to overwrite an existing attendee.
 * A caller that could post its own preview could name any attendee UUID and any
 * field values and have them written. So the commit route re-derives the preview
 * from the submitted source text and only uses the browser's input to say which
 * rows the administrator approved.
 */

export type ImportMode = "csv" | "paste";

/**
 * A paste is a list of addresses, not a roster, so it stays small. The ceiling is
 * generous for a CSV roster and still refuses an unbounded body before it is
 * parsed.
 */
export const MAX_IMPORT_CHARACTERS = 2_000_000;

export type ImportSource =
  | { ok: true; mode: ImportMode; content: string }
  | { ok: false; message: string };

/**
 * A row held back from the import rather than written.
 *
 * `paste_cannot_create` is the #88 decision: pasted input only ever resolves
 * against attendees who already exist. Creating an attendee needs a CSV, which
 * is the only path that carries a student ID and a full name together.
 */
export type WithheldRow = {
  row: number;
  reason: "paste_cannot_create";
  message: string;
};

export function readImportSource(body: unknown): ImportSource {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Send the recipient list as a JSON object." };
  }

  const { mode, content } = body as { mode?: unknown; content?: unknown };

  if (mode !== "csv" && mode !== "paste") {
    return {
      ok: false,
      message: 'Say whether this is a "csv" upload or a "paste" of addresses.',
    };
  }

  if (typeof content !== "string" || content.trim().length === 0) {
    return { ok: false, message: "The recipient list is empty." };
  }

  if (content.length > MAX_IMPORT_CHARACTERS) {
    return {
      ok: false,
      message: "That list is too large to import. Split it into smaller files.",
    };
  }

  return { ok: true, mode, content };
}

export function parseImportSource({
  mode,
  content,
}: {
  mode: ImportMode;
  content: string;
}): ParseResult {
  return mode === "csv" ? parseCsv(content) : parsePastedRecipients(content);
}

/**
 * Parses the source and builds the conflict preview, which is the read-only half
 * of the chain (TSK-0502 and TSK-0503).
 */
export async function buildImportPreview({
  mode,
  content,
}: {
  mode: ImportMode;
  content: string;
}): Promise<{ parse: ParseResult; preview: ConflictPreview; withheld: WithheldRow[] }> {
  const parse = parseImportSource({ mode, content });
  const preview = await previewAttendeeConflicts(parse.records);
  const { preview: scoped, withheld } = applyCreationPolicy(mode, preview);

  return { parse, preview: scoped, withheld };
}

/**
 * Keeps a paste from creating anyone.
 *
 * A pasted address that matches nobody is not an error, it is simply not
 * something a paste can do, so the row is reported as withheld instead of being
 * turned into a conflict. Reusing `conflicts` would mean inventing an
 * `AttendeeConflictReason` that means something else, and that union is closed
 * for a reason.
 */
function applyCreationPolicy(
  mode: ImportMode,
  preview: ConflictPreview
): { preview: ConflictPreview; withheld: WithheldRow[] } {
  if (mode !== "paste" || preview.newAttendees.length === 0) {
    return { preview, withheld: [] };
  }

  return {
    preview: { ...preview, newAttendees: [] },
    withheld: preview.newAttendees.map((record) => ({
      row: record.row,
      reason: "paste_cannot_create" as const,
      message:
        "This address is not on your attendee list yet. Upload a spreadsheet to add new attendees.",
    })),
  };
}

/**
 * Narrows a preview to the rows an administrator approved.
 *
 * Rows are identified by their line in the source, which the browser echoes back
 * unchanged, so an approval for one row can never widen into another. Anything
 * not approved is simply absent from the preview handed to the transaction.
 */
export function filterPreviewToRows(
  preview: ConflictPreview,
  approvedRows: number[]
): ConflictPreview {
  const approved = new Set(approvedRows);

  const keep = (record: IngestionRecord) => approved.has(record.row);

  return {
    newAttendees: preview.newAttendees.filter(keep),
    updates: preview.updates.filter((update) => keep(update.record)),
    conflicts: preview.conflicts.filter((conflict) => keep(conflict.record)),
  };
}

export function readApprovedRows(body: unknown): number[] | null {
  const rows = (body as { approvedRows?: unknown } | null)?.approvedRows;

  if (rows === undefined) {
    return null;
  }

  if (!Array.isArray(rows) || rows.some((row) => typeof row !== "number")) {
    return null;
  }

  return [...new Set(rows)];
}
