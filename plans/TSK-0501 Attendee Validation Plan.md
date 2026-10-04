## Goal

Provide the validation primitives the recipient-ingestion engine needs: case-insensitive
email normalization, email shape validation, required student-ID validation, and name
validation. Every rejection must name the offending field and return a message an
administrator can act on, because US-10 requires actionable feedback rather than a
boolean.

## Source Of Truth

- GitHub child issue [#26: TSK-0501 email normalization and student ID validation](https://github.com/UMak-SIC/sic-app/issues/26)
- GitHub epic [#58: EPIC-05 Attendee Registry & Recipient Ingestion Engine](https://github.com/UMak-SIC/sic-app/issues/58)
- `docs/traceability-matrix.md` (TSK-0501, US-10, US-11, DMA-02)
- `CONTEXT.md` (Attendee definition: unique student ID, name, and email address)
- `app/prisma/schema.prisma` (`Attendee`: `normalizedEmail` unique, `displayEmail`, `name` required, `studentId` required and unique)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider traceability
matrix are historical/derived context, not decision inputs.

## Non-Goals

- CSV and pasted-input parsing (TSK-0502, #27).
- Conflict detection against `attendees` (TSK-0503, #28).
- The upsert transaction (TSK-0504, #29).
- The past-attendee selector UI (TSK-0505, #30).
- Any database access. This module is pure and holds no Prisma import, so it is
  usable from a parser, a service, or a route handler.

## Execution Order

Single self-contained slice. No internal dependencies, so it branches directly from
`dev`.

## PR Stacking Strategy

```
dev
`-- feat/tsk-0501-attendee-validation -> dev
```

First link in the ingestion chain. The following branches stack on it:

```
feat/tsk-0502-ingestion-parsers       -> feat/tsk-0501-attendee-validation
feat/tsk-0503-conflict-preview        -> feat/tsk-0502-ingestion-parsers
feat/tsk-0504-attendee-upsert         -> feat/tsk-0503-conflict-preview
```

## Linear Sub-Issue Tracking

No Linear project is configured. Epic #58 owns children #26 through #30. This PR
completes #26 and is the leaf dependency for #27.

### 1. Return field-level results, not booleans

Each validator returns a discriminated union carrying the offending `field` and a
message. A caller rendering a form needs to know *which* input was rejected, and
`{ valid: false, error: string }` alone forces the caller to re-derive that.

- `validateEmail` returns `{ normalizedEmail, displayEmail }` on success, because
  DMA-02 stores two columns: the normalized form is the identity used for
  case-insensitive matching, and the display form preserves the addresser's casing
  for the email they actually receive.
- `validateStudentId` and `validateAttendeeName` return the trimmed value.
- The `failure` helper is generic over its field literal. Without that, TypeScript
  widens `field` to the `AttendeeField` union and every call site fails to satisfy
  the narrower result type. Vitest does not typecheck, so this only surfaces in
  `pnpm build`; run the build, not just the tests.

### 2. Keep the email check deliberately conservative

A full RFC 5322 parser is not the goal. The function accepts the shapes real student
addresses use and rejects the malformed input US-10 asks about. Structural rules:

- Exactly one `@`, with a non-empty local part before it.
- Local part at most 64 characters, no leading, trailing, or consecutive dots.
- At least two domain labels, so `user@localhost` is rejected.
- An alphabetic TLD of two or more characters, so `user@example.1` is rejected.
- Domain labels may not start or end with a hyphen.
- Whole address at most 254 characters.

Order the checks so the message is specific: a missing domain is reported as a
missing domain rather than as a missing `@`, because that is what the administrator
actually has to fix.

### 3. Keep the student-ID rule narrow and explainable

Required, no leading or trailing whitespace, at most 64 characters, and limited to
letters, digits, and the `. _ / -` separators. Those are the shapes a student
registry uses, and rejecting anything else early gives a better message than a
database constraint violation would.

Note that global uniqueness of `student_id` is a database concern. This module
validates shape; TSK-0503 and TSK-0504 handle the uniqueness conflict.

### 4. Hand-roll rather than add a validation library

The sprint plan proposed `zod` here. On reading the existing code, that is the
wrong call and this PR does not do it:

- The codebase has no validation dependency today, and
  `app/lib/storage/upload-validation.ts` hand-rolls the same discriminated-union
  shape this module needs.
- `zod`'s `.email()` is a regex underneath; it would not make this check more
  correct, only shorter.
- The two primitives needed here are small and fully covered by tests.

Focused libraries remain justified for the Markdown sanitizer and the QR encoder
(Stacks C and D), where hand-rolling would mean writing security-sensitive parsing
code. That is a different risk class from a length-and-shape check.

## Acceptance Criteria

- `validateEmail` returns both `normalizedEmail` and `displayEmail` for a valid
  address, trimming surrounding whitespace and lowercasing only the normalized form.
- `validateStudentId` and `validateAttendeeName` return the trimmed value.
- Every rejection names its field and returns a specific, actionable message.
- Case and padding variants of one address collapse to a single normalized identity,
  covering US-11.
- Structural email cases are covered: missing or duplicate `@`, leading/trailing/
  consecutive dots in the local part, bare hosts, numeric TLD, empty domain labels,
  and the length boundaries.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.
- TSK-0501 marked `[x] Completed` in `docs/traceability-matrix.md`.
