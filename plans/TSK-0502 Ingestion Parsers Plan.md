## Goal

Parse recipient lists from an uploaded CSV and from pasted text into validated
attendee records, reporting every malformed row individually rather than failing
the whole import. US-07 covers CSV upload, US-09 covers comma / line-break / list
input, and US-10 requires malformed addresses to produce actionable feedback.

## Source Of Truth

- GitHub child issue [#27: TSK-0502 CSV and pasted recipient ingestion parsers](https://github.com/UMak-SIC/sic-app/issues/27)
- GitHub epic [#58: EPIC-05 Attendee Registry & Recipient Ingestion Engine](https://github.com/UMak-SIC/sic-app/issues/58)
- `docs/traceability-matrix.md` (TSK-0502, US-07, US-09, US-10, DMA-02)
- `plans/TSK-0501 Attendee Validation Plan.md` (the validators this module consumes)
- `CONTEXT.md` (Attendee definition)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider traceability
matrix are historical/derived context, not decision inputs.

## Non-Goals

- Conflict detection against `attendees` (TSK-0503, #28).
- The upsert transaction (TSK-0504, #29).
- The past-attendee selector UI (TSK-0505, #30).
- Deduplicating addresses within one import. Every record is returned with its
  `normalizedEmail` so TSK-0503 can detect duplicates; collapsing them here would
  hide the conflict from the administrator instead of previewing it.
- Any database access. The module is pure and routes every field through the
  TSK-0501 validators.

## Execution Order

Single vertical slice consuming the validators from `feat/tsk-0501-attendee-validation`.

## PR Stacking Strategy

```
feat/tsk-0501-attendee-validation
`-- feat/tsk-0502-ingestion-parsers -> feat/tsk-0501-attendee-validation
    `-- feat/tsk-0503-conflict-preview     -> feat/tsk-0502-ingestion-parsers
        `-- feat/tsk-0504-attendee-upsert  -> feat/tsk-0503-conflict-preview
```

Retarget each pull request to `dev` once its parent merges.

## Linear Sub-Issue Tracking

No Linear project is configured. Epic #58 owns children #26 through #30. This PR
completes #27. #26 merged into this branch first; #28 depends on this branch.

### 1. Never throw mid-parse

A bad row must not discard the rest of the batch. Both entry points return
`{ records, errors }` together, so the administrator sees every malformed row at
once and fixes them in a single pass. Throwing on the first bad row, or returning
early, would make an import of 200 recipients cost 200 round trips.

### 2. CSV tokenizer

Hand-rolled RFC 4180 tokenizer rather than a CSV library, because the requirement
is narrow and the existing code has no parsing dependency:

- Quoted fields may contain commas, escaped quotes (`""`), and newlines.
- A quote only opens a quoted field at the start of a field; elsewhere it is
  literal, so a value like `5"` does not corrupt the row.
- `\r\n` and bare `\r` both terminate a row.

Track the source line each record **starts** on, not its index in the record list.
A quoted field containing a newline makes one record span two lines, so index-based
numbering would drift from the file the administrator is looking at. This was a real
bug in the first draft and the test for it now pins the behaviour.

### 3. Column mapping

Map headers case-insensitively, ignoring punctuation, so `Email Address`, `E-mail`,
and `email` all resolve. Any column order is accepted.

- A first row with no `@` anywhere and more than one cell is treated as a header.
  A data row always contains an address, so this is reliable.
- If the header has no email column, report a `format` error naming the problem
  rather than falling through and producing a confusing per-row failure.
- With no header, fall back to fixed positions: name `0`, email `1`, student ID `2`.

The first draft computed the fallback as `columns?.email ?? index`, which pointed
at the name column for every row. Fixed positions are the only correct fallback.

### 4. Pasted input

US-09 allows commas, line breaks, or a list. Split on all of them at once, which is
safe because none of `, ; \t` are legal in an unquoted address.

Then decide per line what the administrator actually pasted:

- **Every cell is an address** → the line was several addresses, emit one record each.
- **Otherwise** → the line is one record. Locate the cell containing `@` rather than
  assuming a column order, then assign the remaining cells by role.

Strip bullets and numbering (`- `, `* `, `• `, `1. `, `1) `) first, since those are
common in a copied list.

### 5. Assigning name versus student ID by shape

Given the non-address cells, column position is not trustworthy in pasted text. Shape
alone is also ambiguous: `Ben` is all letters and passes the student ID pattern
outright, which made the first draft read `Ben,ben@example.com,2023-8` as name
`2023-8` and ID `Ben`.

The reliable discriminator is a digit. A person's name does not contain one and a
student ID essentially always does, so a cell is treated as a student ID when it
contains a digit **and** passes `validateStudentId`. When neither cell qualifies,
keep the first as the name so the second is reported as a student ID error rather
than being silently dropped.

## Acceptance Criteria

- CSV with a header row maps name, email, and student ID in any column order and
  with varied header spelling.
- CSV without a header row falls back to fixed positions.
- Quoted fields containing commas, escaped quotes, and newlines parse correctly, and
  each record reports the source line it starts on.
- CRLF input and a trailing newline parse without spurious rows.
- Pasted input accepts comma, semicolon, tab, and newline separation, strips list
  decorations, and handles a single line holding several addresses.
- A pasted record line assigns name and student ID by shape, not position, in either
  order.
- A malformed row produces one error naming its field, and every valid row in the
  same batch still parses.
- A header with no email column, and an unterminated quoted field, each produce a
  `format` error rather than a misleading per-row failure.
- Empty and whitespace-only input returns empty results.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.

## Open Question For Review

Splitting a pasted line on all delimiters at once assumes no quoted input. If
administrators need to paste quoted CSV rows into the free-text box rather than
upload a file, `parsePastedRecipients` should detect a quote and delegate to
`parseCsv` instead. That is a one-line branch at the top of the function, but it
changes behaviour, so it is left out here and flagged for the reviewer.
