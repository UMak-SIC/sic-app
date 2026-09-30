## Goal

Apply an approved attendee import in one transaction: overwrite approved existing
attendees in place, create approved new ones, and never write a row the preview
flagged as a conflict. DMA-02 requires that overwrites preserve attendee UUIDs.

## Source Of Truth

- GitHub child issue [#29: TSK-0504 attendee upsert transaction](https://github.com/UMak-SIC/sic-app/issues/29)
- GitHub epic [#58: EPIC-05 Attendee Registry & Recipient Ingestion Engine](https://github.com/UMak-SIC/sic-app/issues/58)
- `docs/traceability-matrix.md` (TSK-0504, DMA-02)
- `plans/TSK-0503 Conflict Preview Plan.md` (the `ConflictPreview` this applies)
- `app/prisma/schema.prisma` (`Attendee`, `EventRosterEntry.attendeeId`)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider traceability
matrix are historical/derived context, not decision inputs.

## Non-Goals

- Re-previewing. The caller supplies an already-approved `ConflictPreview`; this
  task trusts it rather than re-querying.
- Resolving conflicts. A conflicted row is reported, never written.
- The past-attendee selector UI (TSK-0505, #30).
- Changing the `attendees` schema to allow a null `student_id`. See the open
  question below.

## Execution Order

Single slice consuming `ConflictPreview` from TSK-0503.

## PR Stacking Strategy

```
feat/tsk-0503-conflict-preview
`-- feat/tsk-0504-attendee-upsert -> feat/tsk-0503-conflict-preview
```

Retarget to `dev` once each parent merges. This completes EPIC-05's backend.

## Linear Sub-Issue Tracking

No Linear project is configured. Epic #58 owns children #26 through #30. This PR
completes #29. #30 is UI and remains open.

### 1. Overwrite in place, never replace

`event_roster_entries.attendee_id` references `attendees.id`, and
`email_deliveries` chains through it. A delete-then-create would orphan every
roster entry, attendance record, and delivery for that person. So an overwrite is
`update({ where: { id } })` against the existing UUID, which is what the
verification criterion means by "preserving UUIDs".

### 2. Never write a conflicted row

`preview.conflicts` is carried straight through to `unapplied`. This is the
backstop for the dangerous case TSK-0503 found: a row whose student ID and email
belong to two different people. If it were written, it would rewrite the wrong
attendee and collide on the other. The conflict path performs no write at all.

### 3. Write only the fields the preview listed

`update.changes` contains only attributes that would actually differ. Applying
that set directly means an absent field is never interpreted as "clear this".
The `proposed === null` guard is the second line of defence for the same reason.

### 4. Keep the two email columns consistent

`normalizedEmail` is the unique identity; `displayEmail` is what the attendee
sees. They are never set independently. When a change carries a new
`displayEmail`, the normalized value is recomputed with `normalizeEmail` from
TSK-0501 rather than taken from the record, so a padded or mixed-case address
cannot produce a display value and an identity that disagree.

Colliding on a new normalized email is already excluded: if the new address
belonged to another attendee, TSK-0503 would have reported
`matches_multiple_attendees` and the row would never reach this function.

### 5. Skip no-op writes

An update with an empty `changes` array reports the attendee as updated but
issues no write, so `updated_at` does not move and a re-import of unchanged data
does not churn the table.

## The `student_id` Constraint

`attendees.student_id` is `NOT NULL` and unique. A pasted address-only list
therefore cannot become attendees at all, and attempting the insert would fail and
roll back the entire import.

Rather than let one row destroy the batch, such rows are reported as
`unapplied` with reason `missing_student_id` and a message naming the row, and
the rest of the import still applies. `name` also falls back to the display email
for a new row that has a student ID but no name, so the required column is
populated with something an administrator can correct.

## Acceptance Criteria

- The entire import runs inside a single `$transaction`.
- An overwrite uses `update` keyed by the existing UUID, so `attendee.id` and every
  referencing roster entry, delivery, and attendance row survive.
- A `displayEmail` change also recomputes `normalizedEmail` from the same value.
- A row with no changes issues no write but is still reported as updated.
- A row whose preview entry is a conflict is never written and is returned in
  `unapplied` with its original message.
- A new row without a student ID is reported as `missing_student_id` and does not
  fail the import; other rows still apply.
- A new row with a student ID but no name falls back to the display email.
- A `proposed: null` change leaves the stored field untouched.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.

## Open Question For Review

`attendees.student_id` being required means a pasted email-only list cannot be
imported. That is a product decision in DMA-02, not an oversight here, and it
constrains what TSK-0505's recipient selector can offer. Two options, both needing
a product decision rather than a code change:

1. Leave it required. The import UI must then require a student ID for every new
   attendee and explain why before the administrator submits.
2. Make `student_id` nullable and enforce it only at campaign submission.

Option 2 loosens a stated data-model rule, so it is not this task's call. Raised
here because the current behaviour is that pasted addresses without student IDs
are silently unapplicable, and the UI needs to know that before it is built.
