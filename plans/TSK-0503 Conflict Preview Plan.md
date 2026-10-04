## Goal

Stage an import against existing `attendees` records and separate the rows that
are safe to apply from the rows an administrator has to resolve, per DMA-02.
Read-only: nothing is written here. TSK-0504 applies the approved result.

## Source Of Truth

- GitHub child issue [#28: TSK-0503 attendee conflict preview service](https://github.com/UMak-SIC/sic-app/issues/28)
- GitHub epic [#58: EPIC-05 Attendee Registry & Recipient Ingestion Engine](https://github.com/UMak-SIC/sic-app/issues/58)
- `docs/traceability-matrix.md` (TSK-0503, DMA-02, US-11)
- `plans/TSK-0501 Attendee Validation Plan.md`, `plans/TSK-0502 Ingestion Parsers Plan.md`
- `app/prisma/schema.prisma` (`Attendee`: `normalizedEmail` unique, `displayEmail`, `name` required, `studentId` required and unique)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider traceability
matrix are historical/derived context, not decision inputs.

## Non-Goals

- Applying anything. TSK-0504 owns the write transaction.
- The past-attendee selector UI (TSK-0505, #30).
- Resolving conflicts automatically. Surfacing them is the whole point; guessing
  which attendee the administrator meant is the failure mode this task exists to
  prevent.

## Execution Order

Single slice consuming `IngestionRecord` from the TSK-0502 parser.

## PR Stacking Strategy

```
feat/tsk-0502-ingestion-parsers
`-- feat/tsk-0503-conflict-preview -> feat/tsk-0502-ingestion-parsers
    `-- feat/tsk-0504-attendee-upsert -> feat/tsk-0503-conflict-preview
```

Retarget to `dev` once each parent merges.

## Linear Sub-Issue Tracking

No Linear project is configured. Epic #58 owns children #26 through #30. This PR
completes #28; #29 depends on it.

### 1. Deduplication lives here, not in the parser

The TSK-0502 parser deliberately returns every row, including rows that collide
with each other. Collapsing them at parse time would hide the collision; the
administrator needs to see "you pasted this person twice" and choose. So
within-import duplicate detection is part of this task.

### 2. One query, matched both ways

A single `findMany` with `OR: [{ studentId: { in } }, { normalizedEmail: { in } } ]`
returns every candidate row. Looking each up separately would be one round trip
per imported row.

Index the two sets into maps by `studentId` and by `normalizedEmail`. Matching on
`normalizedEmail` rather than `displayEmail` is what US-11 requires: the unique
constraint is on the normalized column, so a match on the display value could
miss a collision that the database will reject.

### 3. Four outcomes per row

| Outcome | Condition |
| :--- | :--- |
| update | Matches one existing attendee, and no earlier row claimed it |
| new | Matches nothing, and claims no unique value an earlier row took |
| conflict `matches_multiple_attendees` | Student ID and email resolve to two *different* attendees |
| conflict `duplicate_in_import` | An earlier row in this import already claimed the attendee or the unique value |

`matches_multiple_attendees` is the dangerous one. The row's student ID belongs
to one person and its email to another, so there is no correct automatic action:
overwriting would rewrite the wrong attendee and collide on the other. The service
reports it and stops; TSK-0504 must not apply it.

### 4. Track claims within the import

`claimedAttendees`, `claimedStudentIds`, and `claimedEmails` accumulate as rows
are processed, so a collision inside one file is reported with a row number the
administrator can find, instead of surfacing later as a Prisma unique-constraint
violation with no indication which row caused it.

Processing continues after a conflict. One bad row must not hide the rest.

### 5. Report only attributes that would change

`changes` lists just the fields that differ, including the field name, current
value, and proposed value. TSK-0604 will render this as a diff before the
administrator approves, so an empty `changes` array meaning "already up to date"
must be distinguishable from a populated one.

Absent fields are not treated as changes. A pasted row may carry no name or no
student ID, and an absent value must not be read as "clear this field".

## Acceptance Criteria

- A row matching an existing attendee on student ID, on normalized email, or on
  both is reported as an update with `matchedBy` distinguishing the cases.
- `changes` contains only attributes that would actually change, each with its
  current and proposed value.
- A row matching nothing is reported as a new attendee.
- A row whose student ID and email belong to different attendees is reported as
  `matches_multiple_attendees` and is not offered as an update or a create.
- Two rows resolving to the same existing attendee are reported once as an update
  and once as `duplicate_in_import`.
- Two new rows colliding on student ID, or on email in any casing, are reported as
  `duplicate_in_import`.
- An empty import returns empty results without querying the database.
- Processing continues past a conflicting row.
- No write is performed.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.

## Open Question For Review

The single `findMany` builds one `OR` clause holding every student ID and email
in the import. That is fine for the import sizes this admin tool will see, but a
very large file could produce a statement with more bind parameters than the
driver accepts. If bulk imports are expected, chunk the lookup by a few hundred
identifiers and merge the results. Not done here to avoid speculative complexity;
flagged so the limit is a known property rather than a surprise.
