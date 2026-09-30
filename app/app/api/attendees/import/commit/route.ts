import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { applyAttendeeImport } from "@/lib/services/attendee-service";
import {
  buildImportPreview,
  filterPreviewToRows,
  readApprovedRows,
  readImportSource,
} from "@/lib/services/ingestion/import-request";

/**
 * Write half of the attendee import chain (TSK-0504, US-11).
 *
 * The browser sends the source text and the rows an administrator approved, and
 * nothing else. The preview is rebuilt here from the text, so a caller cannot
 * post a fabricated preview naming an attendee UUID and field values to
 * overwrite. Everything happens in the one transaction inside
 * `applyAttendeeImport`, so a failure part way through leaves the registry
 * untouched rather than half-imported.
 */
export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (authResult instanceof Response) {
    return authResult;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "We could not read that upload. Try the file again." },
      { status: 400 }
    );
  }

  const source = readImportSource(body);
  if (!source.ok) {
    return NextResponse.json({ error: source.message }, { status: 400 });
  }

  const approvedRows = readApprovedRows(body);
  if (approvedRows === null) {
    return NextResponse.json(
      { error: "Choose which rows to import, then try again." },
      { status: 400 }
    );
  }

  const { preview, withheld } = await buildImportPreview(source);
  const approved = filterPreviewToRows(preview, approvedRows);

  if (
    approved.newAttendees.length === 0 &&
    approved.updates.length === 0 &&
    approved.conflicts.length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "None of the rows you chose can be imported. Review the list and try again.",
        withheld,
      },
      { status: 400 }
    );
  }

  const result = await applyAttendeeImport(approved);

  return NextResponse.json(
    {
      created: result.createdIds.length,
      updated: result.updatedIds.length,
      skipped: result.unapplied.length,
      unapplied: result.unapplied,
      withheld,
    },
    { status: 200 }
  );
}
