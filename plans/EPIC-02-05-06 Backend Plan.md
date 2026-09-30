## Goal

Deliver the purely backend slices of EPIC-02, EPIC-05, and EPIC-06: the Next.js
route-protection boundary, the attendee validation and recipient-ingestion
engine, and the Markdown compiler plus HMAC-signed QR ticket generation. These
tasks carry no UI dependency and unblock the remaining admin UI work.

## Source Of Truth

- GitHub epic [#55: EPIC-02 Authentication & Administrator Authorization](https://github.com/UMak-SIC/sic-app/issues/55)
- GitHub epic [#58: EPIC-05 Attendee Registry & Recipient Ingestion Engine](https://github.com/UMak-SIC/sic-app/issues/58)
- GitHub epic [#59: EPIC-06 Email Composer, Markdown Engine & QR Ticket Generation](https://github.com/UMak-SIC/sic-app/issues/59)
- GitHub child issues [#16](https://github.com/UMak-SIC/sic-app/issues/16), [#17](https://github.com/UMak-SIC/sic-app/issues/17), [#26](https://github.com/UMak-SIC/sic-app/issues/26), [#27](https://github.com/UMak-SIC/sic-app/issues/27), [#28](https://github.com/UMak-SIC/sic-app/issues/28), [#29](https://github.com/UMak-SIC/sic-app/issues/29), [#31](https://github.com/UMak-SIC/sic-app/issues/31), [#32](https://github.com/UMak-SIC/sic-app/issues/32), [#33](https://github.com/UMak-SIC/sic-app/issues/33)
- `CONTRIBUTING.md` (branching, Conventional Commits, PR requirements)
- `AGENTS.md` (PR template and manual issue-linking rules)
- `CONTEXT.md` (Admin, Attendee, Event Roster Entry, QR Ticket, Asset definitions)
- `app/AGENTS.md` (Next.js 16 breaking changes; read `node_modules/next/dist/docs/`)
- `neon.ts` (bucket names `private-images` / `public-images`, `auth: true`)
- `.agents/skills/neon-auth/references/managed-auth.md` (Next 16 proxy pattern)
- `.agents/skills/neon-object-storage/SKILL.md`

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and
`docs/traceability-matrix.md` are **historical / derived** artifacts. They are
read for context only and are never the basis for a decision. The epic and task
issues above are the canonical contracts.

## Non-Goals

- Any UI work: TSK-0203 (#18) unauthorized page, TSK-0505 (#30) past-attendee
  selector, TSK-0604 (#34) email composer UI, and the `app/app/(auth)/` sign-in
  page that is the other half of TSK-0201.
- TSK-0605 (#35) single-address test send: requires a Mailgun/Brevo provider
  client, which belongs to EPIC-07.
- All of EPIC-04, EPIC-07, EPIC-09, and EPIC-10.
- Reconciling the 14 pre-existing stale TSK rows or the 47 reverse-matrix rows in
  `docs/traceability-matrix.md`. Each PR flips only its own rows.
- Resolving the `campaign_assets` / DMA documentation gap, the vestigial
  `neon.ts` `preview.functions` entry, the stale local
  `docs/epic-04-05-plans` branch, or the stray untracked `app/package-lock.json`.
- Changing the Neon Managed Better Auth production configuration or moving any
  credential into browser code.

## Execution Order

### Step 0 — Baseline

Pull `origin/dev` (the local `dev` branch is 7 commits behind). From `app/`,
confirm `pnpm test`, `pnpm lint`, and `pnpm build` are green before branching.
Fix forward anything PR #79 left red. Do not branch from a red baseline.

### Step 1 — Route protection (Stack A)

Closes the currently public `/checkin` route and establishes the network
boundary every later admin page depends on.

### Step 2 — Attendee ingestion chain (Stack B)

Four stacked PRs. Each builds on the previous one's exported.

### Step 3 — Markdown compiler (Stack C)

Independent of Stacks A and B. Highest-risk item: the HTML sanitizer.

### Step 4 — QR signing and rendering (Stack D)

Two stacked PRs. The signer's typed rejection reasons are the contract that
TSK-0902 (#47) will consume later.

## PR Stacking Strategy

```
dev
|-- feat/tsk-0201-0202-route-protection        -> dev
|-- feat/tsk-0501-attendee-validation          -> dev
|   `-- feat/tsk-0502-ingestion-parsers        -> feat/tsk-0501-attendee-validation
|       `-- feat/tsk-0503-conflict-preview     -> feat/tsk-0502-ingestion-parsers
|           `-- feat/tsk-0504-attendee-upsert  -> feat/tsk-0503-conflict-preview
|-- feat/tsk-0601-markdown-compiler            -> dev
`-- feat/tsk-0602-qr-signer                    -> dev
    `-- feat/tsk-0603-qr-image-generator       -> feat/tsk-0602-qr-signer
```

Every branch starts from `dev`. Each PR targets its parent branch until the
parent merges into `dev`, then retargets to `dev`. Merge commits only, no
squash merges, no rebasing shared branches, no force-pushing `dev`/`staging`/
`main`.

## Linear Sub-Issue Tracking

No Linear project is configured. GitHub epics #55, #58, and #59 own the nine
implementation children. GitHub records no explicit `blockedBy` links; the
dependencies below are inferred from the task issues' target components and
verification criteria.

### 1. Protect admin routes at the network boundary (#16, #17)

- Add `app/proxy.ts` at the `app/` root using the installed SDK's own guard:
  `auth.middleware({ loginUrl: "/auth/sign-in" })` from
  `@neondatabase/auth/next/server` 0.5.0-beta. The `loginUrl` default is already
  `/auth/sign-in`; pass it explicitly for clarity.
- Set `config.matcher` to the protected pages. It must cover `/checkin` (today a
  public `"use client"` page with no `requireAdmin()` call) and the admin event
  and attendance routes. It must **not** cover `/api/auth/**`, `_next/static`,
  `_next/image`, or `public/` assets, or the sign-in page cannot load.
- Keep `app/lib/auth/require-admin.ts` as the authoritative authorization check
  for API routes and server components. The Next.js 16 proxy guide states proxy
  is for optimistic redirects and "should not be used as a full session
  management or authorization solution", so the `admins.neon_auth_user_id`
  lookup stays in `require-admin.ts`.
- Unauthenticated page requests redirect to `/auth/sign-in`. That page is not
  built in this sprint; the redirect target is intentionally left for the UI
  half of TSK-0201. Security is correct immediately.
- Add `app/tests/app/proxy.test.ts` covering: unauthenticated page request
  redirects to `/auth/sign-in`; `/api/auth/**` and static assets bypass the
  guard; matcher excludes do not trigger a redirect.
- Flip the TSK-0201 and TSK-0202 rows in `docs/traceability-matrix.md`. Close
  #17. Leave #16 open with a comment recording that the `app/proxy.ts` and
  session-wiring half is done and the `app/app/(auth)/` sign-in page remains.

### 2. Validate emails and student IDs (#26)

- Add `app/lib/validation/attendee-validation.ts` exporting `normalizeEmail`,
  `isValidEmail`, and `validateStudentId`.
- `normalizeEmail` trims and lowercases. `isValidEmail` returns a descriptive
  field-level error rather than a boolean, because US-10 requires "actionable
  feedback". `validateStudentId` enforces the required, non-empty,
  globally-unique `student_id` contract from DMA-02.
- Add `zod` as a dependency and justify it in the PR's Files Touched.
- Add `app/tests/lib/validation/attendee-validation.test.ts` asserting
  case-insensitive normalized matching, invalid email rejection, and invalid
  student ID rejection.
- Flip the TSK-0501 row and close #26.

### 3. Parse CSV and pasted recipient input (#27)

- Add `app/lib/services/ingestion/parser.ts` exporting a CSV parser and a
  pasted-input parser.
- CSV parsing follows RFC 4180 quoted-field rules with header detection.
  Pasted input accepts comma, newline, and list delimiters.
- Collect row-by-row errors instead of throwing mid-parse: one malformed row
  must not discard the rest of the batch.
- Extract name, email, and student ID cleanly, routing each row through the
  #26 validators.
- Add `app/tests/lib/services/ingestion/parser.test.ts` covering quoted CSV
  fields, header detection, each pasted delimiter, and per-row error reporting.
- Flip the TSK-0502 row and close #27.

### 4. Preview attendee conflicts (#28)

- Add `app/lib/services/ingestion/conflict-service.ts` exporting a read-only
  conflict preview.
- Match existing `attendees` rows on `student_id` **or** `normalizedEmail`.
- Return `{ existing, new, proposedChanges[] }` so the UI can show a diff before
  any write. Perform no writes in this task.
- Add `app/tests/lib/services/ingestion/conflict-service.test.ts` covering
  match-by-student-id, match-by-email, and no-conflict cases.
- Flip the TSK-0503 row and close #28.

### 5. Upsert attendees transactionally (#29)

- Add `app/lib/services/attendee-service.ts` exporting a single `$transaction`
  upsert that consumes the #28 preview.
- Overwrite existing attendee fields while **preserving UUIDs**, so existing
  `event_roster_entries` foreign keys survive (DMA-02).
- Create new attendees for rows with no conflict.
- Add `app/tests/lib/services/attendee-service.test.ts` asserting UUID
  preservation on overwrite and creation of new rows.
- Flip the TSK-0504 row and close #29.

### 6. Compile Markdown to sanitized email HTML (#31)

- Add `app/lib/email/markdown-compiler.ts` supporting headings, fenced code,
  blockquotes, images, and links.
- Add `marked` and `sanitize-html` as dependencies, each justified in the PR's
  Files Touched.
- Sanitization is a hard requirement (US-13), not an enhancement: strict tag and
  attribute allowlists, no `style` attribute, no `javascript:` URLs, and image
  `src` restricted to the Neon Object Storage endpoint.
- Add `app/tests/lib/email/markdown-compiler.test.ts` with hostile fixtures
  (script tags, event handlers, `javascript:` URLs, off-endpoint image hosts),
  not only happy-path input. This is the highest-risk item in the sprint.
- Flip the TSK-0601 row and close #31.

### 7. Sign and verify opaque QR tickets (#32)

- Add `app/lib/security/qr-signer.ts` exporting `signQrTicket` and
  `verifyQrTicket`.
- Token shape: `base64url(payload).base64url(hmacSha256(payload, secret))` over
  `(eventId, rosterEntryId, windowExpiresAt)`. Use `node:crypto`; no new
  dependency.
- The token carries no raw email and no internal attendee ID (DMA-07). The
  check-in window is two hours before `starts_at` through two hours after
  `ends_at` (DMA-05).
- The verifier returns typed rejection reasons — `malformed`, `expired`,
  `wrong_event`, `invalid_signature` — matching the contract TSK-0902 (#47) will
  consume later.
- Add `QR_TICKET_SECRET` to `app/.env.example` and `app/.env.test.example`, and
  add `QR_TICKET_SECRET` to the credential-isolation `rg` guard in
  `.github/workflows/ci.yml` (NFR-03). The guard already covers
  `MAILGUN|BREVO|RETENTION_CRON_SECRET`.
- Add `app/tests/lib/security/qr-signer.test.ts` covering valid verification,
  tampered payload, expired window, wrong event, and forged signature.
- Flip the TSK-0602 row and close #32.

### 8. Render QR ticket images (#33)

- Add `app/lib/email/qr-image-generator.ts` exporting a PNG buffer suitable for
  email CID embedding.
- `@zxing/browser` (added by PR #78) is decode-only, so an encoder is required.
  Add `qrcode` as a dependency and justify it in the PR's Files Touched.
- The generated image contains only the opaque signed token from #32.
- Add `app/tests/lib/email/qr-image-generator.test.ts` asserting a decodable PNG
  whose decoded payload equals the signed token.
- Flip the TSK-0603 row and close #33.

### 9. Verify cross-cutting contracts and update delivery evidence

- From `app/`, run `pnpm db:validate`, the focused Vitest suites, the complete
  `pnpm test` suite without cloud credentials, `pnpm lint`, and `pnpm build`.
- Confirm `pnpm test:e2e` still passes; no E2E behavior changes in this sprint.
- Post one comment on issue #2 marking it historical, resolving the contradiction
  with the earlier "canonical PRD" note and pointing at epics #54-#63 and their
  task issues as the canonical contracts.
- Each PR closes its own issue only after merge, with a comment recording what
  landed and what remains open.

## Acceptance Criteria

- `app/proxy.ts` redirects unauthenticated page requests to `/auth/sign-in`,
  leaves `/api/auth/**` and static assets reachable, and `/checkin` is no longer
  publicly accessible.
- `app/lib/auth/require-admin.ts` remains the authoritative `admins` lookup for
  API routes and server components; the proxy performs no authorization beyond
  the session check.
- Emails normalize case-insensitively, malformed input returns descriptive
  field-level errors, and `student_id` is required and validated.
- CSV and pasted parsers extract name, email, and student ID cleanly and report
  row-by-row syntax errors without discarding valid rows.
- Conflict preview is read-only and matches on `student_id` or
  `normalizedEmail`.
- Approved overwrites preserve attendee UUIDs so existing roster-entry foreign
  keys survive; new attendees are created in the same transaction.
- Markdown compiles to sanitized HTML supporting headings, fenced code,
  blockquotes, and Neon Object Storage images, with no script tags, event
  handlers, `javascript:` URLs, or off-endpoint image hosts in the output.
- QR tickets are HMAC-SHA256 signed over `(eventId, rosterEntryId,
  windowExpiresAt)`, expose no raw email or internal ID, and verify with typed
  `malformed` / `expired` / `wrong_event` / `invalid_signature` reasons.
- QR ticket images are decodable PNGs containing only the opaque signed token.
- `QR_TICKET_SECRET` is documented in `app/.env.example` and
  `app/.env.test.example` and covered by the CI credential-isolation guard.
- From `app/`, `pnpm db:validate`, `pnpm test`, `pnpm lint`, `pnpm build`, and
  `pnpm test:e2e` pass at each task's completion point.
- Every PR uses the full `.github/PULL_REQUEST_TEMPLATE.md`, links its issue
  with `Related issue: #N` rather than a closing keyword, includes
  `plans/<TASK> Plan.md`, and flips only its own TSK row in
  `docs/traceability-matrix.md`.
