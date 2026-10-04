import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { buildImportPreview, readImportSource } from "@/lib/services/ingestion/import-request";

/**
 * Read-only half of the attendee import chain.
 *
 * Takes the raw list, reports every malformed row, and returns what would happen
 * without writing anything (TSK-0502, TSK-0503, US-07, US-09, US-10). The commit
 * route re-derives this rather than trusting what comes back, so the response is
 * a report and not an authorization token.
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

  const { parse, preview, withheld } = await buildImportPreview(source);

  return NextResponse.json(
    {
      mode: source.mode,
      summary: {
        parsed: parse.records.length,
        malformed: parse.errors.length,
        newCount: preview.newAttendees.length,
        updateCount: preview.updates.length,
        conflictCount: preview.conflicts.length,
        withheldCount: withheld.length,
      },
      errors: parse.errors,
      preview,
      withheld,
      // Every row number an administrator can approve. Sent explicitly so the
      // commit route does not have to guess which subset was on screen.
      approvableRows: [
        ...preview.newAttendees.map((record) => record.row),
        ...preview.updates.map((update) => update.record.row),
      ],
    },
    { status: 200 }
  );
}
