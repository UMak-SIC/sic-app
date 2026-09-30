## Goal

Carry out the decision recorded on #109: add `course` and `program` to
`Attendee`, carry them through ingestion and the directory, and remove `shortCode`
from the UI. A follow-up to the #110 comment adds `section` as a third free-text
student attribute, resolved as a student attribute rather than an event one.

## Source Of Truth

- Decision: [#109](https://github.com/UMak-SIC/sic-app/issues/109) comment by
  `CharlesTogle`
- GitHub epic [#58: EPIC-05 Attendee Registry & Recipient Ingestion Engine](https://github.com/UMak-SIC/sic-app/issues/58)
- [#107: `GET /api/attendees`](https://github.com/UMak-SIC/sic-app/issues/107) (PR #108)
- `docs/traceability-matrix.md` (TSK-0501, TSK-0502, TSK-0503, TSK-0504, US-07, US-10, DMA-02)
- `app/lib/validation/attendee-validation.ts`, `app/lib/services/ingestion/*`, `app/lib/services/attendee-service.ts`

## The decision, and the part it did not answer

The comment adopted option 1 — add the columns and a migration — and recorded the
KPI reason: "can be used as a KPI on what courses are being reached by our
events". It also ruled that `short_code` "can be removed, we already have a unique
id for it".

The comment quoted option 1 **including its open question**, so the
single-versus-multi-valued question was never actually answered. It is resolved
here as **two nullable scalars**, because:

- the KPI reason needs only `course`, and a nullable column supports `GROUP BY`
- the UI already models course→program as 1:1 via `PROGRAM_NAMES: Record<CourseType, string>`
- a join table is heavier and can be migrated to later without loss

**The limitation this accepts:** a student in two programs is not representable.
That is a real constraint, not a rounding error, and it should be revisited if
the registrar's data turns out to be multi-valued.

## Schema

```prisma
course  String? @map("course")
program String? @map("program")
```

Both nullable: DMA-02 does not require them and a CSV may omit the columns.
Migration `20261001000000_add_attendee_course_and_program` was generated with
`prisma migrate diff` rather than hand-written.

## Free text, never coerced

This is the substantive design decision, and it reverses what the UI used to do.

The old client-side parser mapped a course string onto a `CourseType` union and
**defaulted anything unrecognised to `BSIT`**:

```ts
if (upper.includes("CS") || upper.includes("COMPUTER")) course = "BSCS";
else if (...) course = "BSINS";
else course = "BSIT";
```

That silently invents a course nobody wrote and folds every unrecognised value
into one bucket — which destroys the exact signal the KPI is for. So
`validateAttendeeCourse` is permissive about content and strict only about length:
the value is stored as the organizer spelled it. Tests pin that an unrecognised
course and a lower-case course both survive verbatim.

Over-long values become a **row error** rather than being truncated, the same as
every other field — truncating would store a different string from the one the
registrar exported, and the KPI would group on it.

## The chain

**Validation** — `AttendeeField` gains `course` and `program`; new
`ATTENDEE_COURSE_MAX_LENGTH` / `ATTENDEE_PROGRAM_MAX_LENGTH` (100) and
`validateAttendeeCourse` / `validateAttendeeProgram`.

**`section`, from the #110 comment** — `{{section}}` was listed as a composer
option and had no source. It is confirmed to be a **student** attribute (the year
and block, as the registrar writes it: `BSIT-2A`), so it is a third nullable
free-text column with the same treatment: `ATTENDEE_SECTION_MAX_LENGTH` (50),
`validateAttendeeSection`, a `section` parser column defaulting to `-1`, aliases
for `section`/`block`/`year` because registrar exports label the same value three
ways, a sixth positional column, and the same import-only-if-present conflict
rule.

**Parser** — `ColumnMap` gains `course` and `program`, both defaulting to `-1`
(absent) so `readCell` yields `null` rather than `""`. Header aliases cover
`course`, `program` and `degree`; the positional fallback reads columns 4 and 5.
Pasted input passes neither, because it resolves only against existing attendees
(DMA-02) and never creates.

**Conflict service** — `AttendeeField` gains both, and `diffAgainst` reports them
**only when the import carried a value**. A CSV with no course column must not
report a change for every existing attendee who has one, which would offer to
blank the field. There is a test for exactly that.

**Upsert** — `create` stores both; `update` applies them alongside the existing
name, studentId and paired-email handling.

**Directory** — `GET /api/attendees` returns both, and the test that previously
pinned their *absence* is replaced by one that pins a `null` course rather than
`""`. An empty string would create an empty bucket in the KPI, which is the same
class of defect as the `CourseType` coercion.

## `shortCode` removed

Contained to two files: `avatar-stack.tsx` (the `EventBadgeItem` field and its
use as an initials fallback) and the seed literals in `attendees/page.tsx`. The
badge now falls back to initials from the event title alone, so nothing is lost
except the abbreviation, which the decision recorded as adding nothing.

## Tests

305 passing, up from 283. New coverage: seven parser cases (named columns, the
`degree` alias, positional, an unrecognised course kept verbatim, author casing
preserved, over-long rejected, empty cell treated as absent), five section cases
(named column, the `block` and `year` aliases, positional, casing preserved,
over-long rejected), conflict-diff and upsert cases for all three fields, and two
upsert cases.

## Still not reachable from here

`{{venue}}` and `{{section}}` are only *stored* by this work. The delivery
resolver in #106 substitutes `{{student_name}}`, `{{student_id}}`,
`{{event_name}}` and `{{event_time}}`, and strips everything else — so both
tokens are still dropped at send time. The resolver cannot gain them until
`Event.venue` (#112) and `attendees.section` (here) are merged, because its
Prisma selects reference columns that do not exist on its own branch. That is a
follow-up once this and #112 land, not something this PR can do.

## Matrix Changes

No new task row. TSK-0501 through TSK-0504 keep their `[x]` status — this does
not re-complete them, it extends what "complete" covers. A note under the EPIC-05
table records the columns, the free-text decision, and the single-versus-multi
limitation.

## Non-Goals

- **Wiring the import dialog**, the conflict review, or the attendees table to
  their endpoints. Still outstanding, and the vocabulary mismatches recorded in
  the read-endpoint plan still apply.
- **Populating existing attendees.** The columns are null until a CSV that
  carries them is imported; there is no backfill.
- **A course-reach KPI.** The column supports it; nothing computes it yet.
- **The `existing` snapshot for conflicts**, which the side-by-side review needs.
  Unrelated to this decision and still missing.

## Acceptance Criteria

- `Attendee` carries nullable `course` and `program`, with a generated migration.
- A CSV with `Course`/`Program` (or `Degree`) columns imports both; one without
  them imports `null`.
- An unrecognised or lower-case course is stored exactly as written.
- An over-long course is a row error, not a truncation.
- A course change appears in the conflict diff; an absent column produces no
  course change.
- A create stores both; an update applies both.
- `GET /api/attendees` returns `course` and `program`, null rather than `""`.
- No `shortCode` remains in the codebase.
- `pnpm test`, `pnpm lint` and `pnpm build` pass.
