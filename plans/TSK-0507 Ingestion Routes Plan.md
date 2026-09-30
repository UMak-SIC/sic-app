## Goal

Give the attendee ingestion chain an HTTP surface, so TSK-0501 through TSK-0504
stop being libraries nothing calls.

## Source Of Truth

- GitHub epic [#57: EPIC-05 Attendee Registry & Recipient Ingestion](https://github.com/UMak-SIC/sic-app/issues/57)
- GitHub child issues [#26 (TSK-0501)](https://github.com/UMak-SIC/sic-app/issues/26), [#27 (TSK-0502)](https://github.com/UMak-SIC/sic-app/issues/27), [#28 (TSK-0503)](https://github.com/UMak-SIC/sic-app/issues/28), [#29 (TSK-0504)](https://github.com/UMak-SIC/sic-app/issues/29)
- GitHub decision issue [#88: student_id policy for pasted imports](https://github.com/UMak-SIC/sic-app/issues/88) (closed)
- `docs/traceability-matrix.md` (TSK-0501 to TSK-0507, US-07, US-09, US-10, US-11, DMA-02)
- `app/lib/services/ingestion/parser.ts`, `conflict-service.ts`, `attendee-service.ts`
- `app/node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider
traceability matrix are historical/derived context, not decision inputs.

**No GitHub issue exists for TSK-0507 yet.** The task ID is in the matrix only.
The PR needs the issue filed so it can carry a `Refs:` trailer.

## Why This Task Existed

A search for non-test callers found the whole chain unreachable:

| Module | Task | Non-test callers |
| --- | --- | --- |
| `lib/validation/attendee-validation.ts` | TSK-0501 | 0 |
| `lib/services/ingestion/parser.ts` | TSK-0502 | 1 (internal) |
| `lib/services/ingestion/conflict-service.ts` | TSK-0503 | 1 (internal) |
| `lib/services/attendee-service.ts` | TSK-0504 | **0** |

`attendees-table.tsx` and `add-attendee-dialog.tsx` reach the database only
through the seed data in `dashboard/events-data.ts`, so the UI could look complete
while no real data ever moved.

## The Trust Boundary

The commit route does not accept a conflict preview from the browser.

`ConflictPreview` is the authorization to overwrite an existing attendee: it
carries `attendeeId` and the field values to write. A route that trusted a
posted preview would let any admin-gated caller name an arbitrary attendee UUID
and arbitrary field values and have them written. So the commit route takes the
raw source text, re-parses it, re-runs `previewAttendeeConflicts`, and uses the
browser's only input to say **which rows were approved**.

Approval is a list of source line numbers, and
`filterPreviewToRows` narrows the rebuilt preview to exactly those. A row number
echoed from the preview cannot widen into a different row, so approving one
overwrite cannot become approving another. `app/tests/app/api/attendees/import/route.test.ts`
asserts this directly, including a request that smuggles a fabricated `preview`
key and confirms only the server-derived, row-filtered preview reaches
`applyAttendeeImport`.

`approvedRows` being absent is distinct from being empty. Absent means the
browser never chose, and the route refuses with 400; that is what stops a
double-submit or a stale client from importing an unapproved batch.

## The #88 Policy, Enforced At The Edge

`attendees.student_id` is NOT NULL and unique, and a paste is a list of
addresses rather than a roster. So a pasted address matching nobody cannot become
a new attendee.

`previewAttendeeConflicts` takes only records, with no notion of source, so the
policy is applied in `buildImportPreview`: for `paste` mode the `newAttendees`
bucket is emptied and those rows are returned as `withheld` instead.

They are deliberately **not** folded into `conflicts`. `AttendeeConflictReason`
is a closed union of `duplicate_in_import` and `matches_multiple_attendees`, and
neither means "a paste cannot create this". A withheld row is not a conflict the
administrator failed to resolve, so it gets its own type with its own plain
message, and the commit response reports it separately from `unapplied`.

## Routes

`app/lib/services/ingestion/import-request.ts` holds the shared logic so the two
routes cannot drift on validation, size limits, the #88 policy, or row filtering.

- `POST /api/attendees/import/preview` — read-only. Returns malformed rows, the
  preview, withheld rows, a summary, and `approvableRows` so the client does not
  have to guess which subset was on screen. Writes nothing.
- `POST /api/attendees/import/commit` — writes. Rebuilds the preview, filters to
  the approved rows, and calls `applyAttendeeImport`, which is already a single
  `$transaction`, so a failure part way through leaves the registry untouched
  rather than half-imported.

Both call `requireAdmin()` first, matching every other route, and both return
`NextResponse.json`. Error copy is operator-facing per the charter: no status
codes, no field names, no backend terms. `MAX_IMPORT_CHARACTERS` bounds the body
before it is parsed.

## Tests

18 cases. `import-request.test.ts` covers source validation, the size ceiling,
parser routing, the #88 creation policy in both directions, row filtering, and
the approved-rows contract. `route.test.ts` covers authentication, the
read-only guarantee of the preview route, malformed bodies, the refusal when
nothing was selected, and the trust boundary.

## Not Done Here: The Dialog Is Blocked On A Data-Model Gap

`import-attendees-dialog.tsx` and `import-conflict-review.tsx` are **not**
wired to these routes, because they cannot be without a decision.

They model an attendee as `{ name, email, studentId, course, program }`. The
`Attendee` model has no `course` and no `program`:

```prisma
model Attendee {
  id              String @id @default(uuid()) @db.Uuid
  normalizedEmail String @unique @map("normalized_email")
  displayEmail    String @map("display_email")
  name            String
  studentId       String @unique @map("student_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
}
```

The conflict review renders `existing.course` and `incoming.course`, and the
dialog's overwrite payload carries `course` and `program`. Neither can be
supplied by the server, and both would be silently dropped. Wiring the dialog
anyway would ship a conflict review with an always-empty column.

The gap is not confined to the import flow. `course` and `program` appear in 20
files, including `attendees-table.tsx`, `add-attendee-dialog.tsx`,
`attendees-toolbar.tsx`, `attendees-insights-card.tsx`, `event-roster.tsx`,
`scan-conflict-dialog.tsx`, and `live-checkin-dialog.tsx`. Resolving it means
either adding the columns to `Attendee` (a migration, and a decision about
whether they are single- or multi-valued) or removing the fields from the UI.

That is a product decision, so it is raised as its own issue rather than absorbed
here. Until it lands, the import routes are complete and correct but have no UI
caller, which is the same state TSK-0501 to TSK-0504 were in.

## Non-Goals

- Reconciling the 14 pre-existing stale TSK rows or the 47 reverse-matrix rows.
  Only the TSK-0507 row is added.
- `add-attendee-dialog.tsx` and the attendees table, which need the same
  `course`/`program` decision before they can be pointed at a real list.
- TSK-0505, the past-attendee selector, which needs its own query service.

## Acceptance Criteria

- `POST /api/attendees/import/preview` requires an admin, reports row-level
  errors and a conflict summary, and writes nothing.
- `POST /api/attendees/import/commit` requires an admin, rebuilds the preview
  server-side, applies only the approved rows in one transaction, and refuses
  when the browser approved nothing.
- A pasted address matching no existing attendee is reported as withheld and
  never created.
- A client-supplied `preview` in the commit body has no effect.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass, and both routes appear in the
  build's route table.
- TSK-0507 marked `[x] Completed` in `docs/traceability-matrix.md`.
