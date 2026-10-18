## Goal

Move the standalone `SIC-QR-GENERATOR` into SIC-APP with no Supabase runtime
dependency: administrators manage QR links at `/qr`, every generated code
points to `https://umak-sic.vercel.app/url/<code>`, and the public resolver
redirects while recording scans in SIC-APP's Neon PostgreSQL database.

## Source Of Truth

- User scope: QR Generator is a SIC-APP tool; its private interface is under
  `/qr/<route>` and its scan URL is `/url/<code>`.
- Parent branch: `feat/app-selector-ems-qr`.
- `app/app/qr/layout.tsx` and `app/app/qr/page.tsx` (existing protected tool
  shell and placeholder page).
- `../SIC-QR-GENERATOR/supabase/migrations/20260902000000_create_urls_and_resolution.sql`
  through `20260902030000_allow_url_reenable.sql` (the current Supabase data
  contract).
- `app/prisma/schema.prisma`, `app/prisma/migrations/`,
  `app/lib/auth/require-admin.ts`, and `app/proxy.ts` (SIC-APP persistence and
  access rules).
- `DESIGN.md` and `AGENTS.md` (mandatory UI, copy, icon, and verification
  rules).

## Non-Goals

- Changing or weakening SIC-APP's Neon Auth/admin model; the QR tool remains
  available only to the allowlisted administrator.
- Changing the signed event-ticket QR/check-in system under `/ems`; short-link
  QR codes are a separate product and data model.
- Reproducing Supabase Auth, Row-Level Security, Storage, React Router,
  TanStack Query, Zustand, Sonner, Geist, or Lucide in SIC-APP.
- Deploying a Neon migration, copying production data, changing the Vercel
  domain, or decommissioning the old Supabase project without explicit
  approval after the dry-run results are reviewed.
- Importing the standalone app's obsolete green/pink visual system; the moved
  UI must use the SIC design tokens, Agrandir/Montserrat, and Phosphor icons.

## Execution Order

Create the QR feature branch from `feat/app-selector-ems-qr`, land the schema
and service first, then the public resolver, authenticated API, dashboard, and
one-time data transfer. Do not cut over the standalone Vercel project until the
new resolver has passed its production smoke checks.

## PR Stacking Strategy

```
feat/app-selector-ems-qr
└── feat/qr-neon-foundation
    └── feat/qr-neon-dashboard
        └── feat/qr-supabase-cutover
```

Create the first child worktree/branch from the named parent branch, not from
`dev`. The foundation PR targets `feat/app-selector-ems-qr`; the dashboard PR
targets the foundation PR; the cutover PR targets the dashboard PR. Merge
bottom-up, then merge the completed stack into the parent branch before its PR
is opened against `dev`.

```bash
git worktree add .worktrees/qr-neon-foundation \
  -b feat/qr-neon-foundation feat/app-selector-ems-qr
git worktree add .worktrees/qr-neon-dashboard \
  -b feat/qr-neon-dashboard feat/qr-neon-foundation
git worktree add .worktrees/qr-supabase-cutover \
  -b feat/qr-supabase-cutover feat/qr-neon-dashboard
```

Do this only after confirming `.worktrees` remains ignored. Run all commands
below from `SIC-APP/app` inside the worktree assigned to that phase.

## Execution Status (2026-10-15)

The implementation is progressing as a stacked three-slice change. The
dashboard worktree and branch are based on `feat/qr-neon-foundation`, as
required by the stacking strategy.

| Slice | Branch | Scope | Status |
| --- | --- | --- | --- |
| 1 | `feat/qr-neon-foundation` | Neon schema, migration, Prisma models, and test-table isolation (Task 1) | Complete |
| 2 | `feat/qr-neon-dashboard` | Server service, public resolver, protected API, and QR workspace (Tasks 2–5) | Complete locally; not yet committed or merged |
| 3 | `feat/qr-supabase-cutover` | Export/import/verifier, production cutover, and release audit trail (Tasks 6–8) | Not started |

Slice 2 was checked against the previous `SIC-QR-GENERATOR` implementation.
In addition to its planned scope, it preserves these legacy operator-facing
behaviors:

- A disabled link remains shown as **Paused** even after its expiry date;
  paused status takes precedence over expiry in the dashboard.
- If a center logo cannot be loaded, QR generation still produces a usable
  no-logo QR image and tells the operator what happened.
- The create/edit dialog renders a live QR preview while the operator changes
  the destination, colors, or logo.

Slice 2 validation completed locally: Prisma generation/validation, Next type
generation, TypeScript, focused linting, and 47 focused QR tests. The full
suite also retained its two pre-existing failures in
`tests/lib/email/qr-image-generator.test.ts`; these are unrelated to QR links.

## Linear Sub-Issue Tracking

No Linear issue was supplied. Create sub-issues from this plan when ready; use
the three branch slices above so each pull request remains independently
reviewable.

### 1. Establish the Neon QR-link schema and test isolation

- Modify `app/prisma/schema.prisma`; create
  `app/prisma/migrations/<timestamp>_add_short_urls/migration.sql`; modify
  `app/tests/database.ts`; and add
  `app/tests/integration/qr/short-url-service.test.ts`.
- Add a `ShortUrlStatus` enum (`ACTIVE`, `DISABLED`), a `ShortUrl` model, and a
  `ShortUrlVisit` model. `ShortUrl` keeps its UUID primary key, unique
  case-sensitive seven-letter `code`, link name, validated HTTPS destination,
  `BigInt` scan count, status, optional expiry, optional public QR-logo asset,
  foreground/background colors, timestamps, and the creating Neon admin;
  `ShortUrlVisit` is append-only and references the short URL with a timestamp.
- The SQL migration must create the enum/tables/indexes/foreign keys and the
  `CHECK` constraints below. Preserve explicit ids and timestamps so historical
  Supabase data can be imported without losing references or chronology.

```sql
CHECK ("code" ~ '^[A-Za-z]{7}$'),
CHECK ("destination" ~ '^https://[^/?#[:space:]]+([/?#].*)?$'
       AND "destination" !~ '[[:space:]]'),
CHECK ("view_count" >= 0)
```

- Add `short_url_visits` and `short_urls` to `applicationTables` before
  `assets`/`admins` in `app/tests/database.ts`; the test database must truncate
  them between cases just like every other persisted table.
- Write the integration tests first. Seed `admin-id`, create active/disabled/
  expired rows, assert code uniqueness and constraints, then assert a resolved
  link increments exactly once and creates one visit. Run
  `pnpm db:generate`, `pnpm db:validate`, and the focused integration test with
  `TEST_DATABASE_URL`; do not point `DATABASE_URL` at the test database.

### 2. Build one server-side short-link service and validate its public contract

- Create `app/lib/services/short-url-service.ts` and
  `app/tests/lib/services/short-url-service.test.ts`; modify
  `app/prisma/schema.prisma` only if generated relation names need aligning.
- Export JSON-safe types and these narrow operations:
  `createShortUrl(input, adminId)`, `listShortUrls(adminId)`,
  `updateShortUrl(id, input)`, `setShortUrlStatus(id, status)`,
  `deleteShortUrl(id)`, `getShortUrlStatus(link, now)`, and
  `resolveShortUrl(code)`. The browser never supplies an admin id; create and
  list scope ownership to the authenticated Neon admin, while update/delete
  use an ownership condition rather than a bare UUID lookup.
- Validate and normalize name (default `Untitled link`), a trimmed absolute
  HTTPS destination, seven-letter codes, ISO expiry dates, `#RRGGBB` colors,
  and public image assets. Reject an expiry at or before the server clock;
  reject a logo asset that is missing or not in `PUBLIC_IMAGES`.
- Generate a random alphabetic seven-character code server-side with bounded
  retry on Prisma unique-conflict (`P2002`). Do not accept client-selected
  codes and do not expose a link list to public callers.
- Implement `resolveShortUrl` as one transaction-safe statement: update only
  an active, unexpired matching link, increment `view_count`, insert its visit,
  and return its destination only when the update succeeded. The equivalent
  PostgreSQL shape is:

```sql
WITH resolved AS (
  UPDATE "short_urls"
  SET "view_count" = "view_count" + 1
  WHERE "code" = $1
    AND "status" = 'active'::"ShortUrlStatus"
    AND ("expires_at" IS NULL OR "expires_at" > now())
  RETURNING "id", "destination"
), tracked AS (
  INSERT INTO "short_url_visits" ("short_url_id")
  SELECT "id" FROM resolved
)
SELECT "destination" FROM resolved;
```

- Test malformed and non-HTTPS destinations, invalid colors/expiry/logo,
  collision retry, owner scoping, disabled/expired behavior, delete cascade,
  and concurrent-equivalent repeated resolution. Never return a destination or
  create a visit for an unresolved link.

### 3. Expose the public `/url/<code>` resolver without exposing the dashboard

- Create `app/app/url/[code]/route.ts`; modify `app/proxy.ts`; and add
  `app/tests/app/url/[code]/route.test.ts` plus `app/tests/proxy.test.ts`.
- Use the current Next route-handler form with
  `RouteContext<'/url/[code]'>`; accept `GET` and `HEAD`, reject non-matching
  codes with a 404, call only `resolveShortUrl`, and return
  `Response.redirect(destination, 302)`. A resolver is always dynamic because
  it writes a scan, so set `export const dynamic = "force-dynamic"`.
- Exclude exactly `url` from the proxy matcher alongside `login`, `register`,
  and `api`. Keep `/qr` inside the default protected matcher; a public scan URL
  must never inherit the `/qr` layout or its admin check.
- For `HEAD`, resolve and count the scan using the same service but return the
  redirect with no response body. Do not render a branded intermediate page,
  reveal link metadata, or redirect invalid/disabled/expired codes to the
  dashboard.
- Test 302 location/header behavior, 404 behavior, code validation before a
  database call, one increment/visit per valid request, HEAD behavior, and the
  proxy distinction between `/url/AbCdEfG` (public) and `/qr` (protected).

### 4. Add the authenticated QR management API and Neon object-storage logo path

- Create `app/app/api/qr/links/route.ts`,
  `app/app/api/qr/links/[id]/route.ts`, and
  `app/tests/app/api/qr/links/route.test.ts`; modify
  `app/app/api/assets/public/upload/route.ts` only if a dedicated QR-logo
  upload response is genuinely needed.
- `GET /api/qr/links` lists the current administrator's links; `POST` creates
  one; `PATCH /api/qr/links/[id]` edits the name/destination/expiry/colors/logo
  binding; `POST /api/qr/links/[id]/status` changes only active/disabled;
  `DELETE /api/qr/links/[id]` removes it after the UI confirmation. Each route
  calls `requireAdmin()` before parsing or querying and returns only plain,
  operator-safe error messages.
- Reuse `POST /api/assets/public/upload` for center-logo uploads. It already
  validates PNG/JPEG/WebP with Sharp, converts to WebP, stores to Neon Object
  Storage, creates an `Asset`, and exposes a public URL. The QR API receives
  only the resulting `assetId`; it must never store a browser-supplied URL.
- Return a stable response shape with `id`, `code`, `name`, `destination`,
  `viewCount` as a number, `status`, `expiresAt`, `qrForeground`,
  `qrBackground`, `qrLogoAssetId`, `qrLogoUrl`, and timestamps. Use
  `publicImageUrl` to derive the latter from the linked asset rather than
  duplicating storage URLs in the table.
- Test unauthenticated/forbidden responses, invalid JSON/input, ownership
  isolation, asset-bucket validation, JSON-safe `BigInt` serialization,
  pause/resume, and delete behavior. Do not add Supabase client variables or
  dependencies to `package.json`.

### 5. Replace the `/qr` placeholder with the SIC-native management workspace

- Modify `app/app/qr/page.tsx`; create `app/components/qr/qr-workspace.tsx`,
  `app/components/qr/qr-link-form-dialog.tsx`,
  `app/components/qr/qr-link-row.tsx`, `app/components/qr/qr-preview-dialog.tsx`,
  `app/components/qr/qr-client.ts`, and focused component tests under
  `app/tests/components/qr/`.
- Keep `app/app/qr/layout.tsx` as the tool-wide `requireAdminPage()` boundary.
  Make the page a server shell that renders the client workspace; the client
  fetches `/api/qr/links`, handles loading/empty/request-error states, refreshes
  its authoritative list after each successful mutation, and never embeds Neon
  or Supabase credentials.
- The workspace must provide: create, edit, pause/resume, delete with explicit
  confirmation, scan count/status/expiry display, QR preview, and PNG download.
  Generate the bitmap in the browser with the already-installed `qrcode`
  package, error correction `H` when a logo exists otherwise `M`, and encode
  `${window.location.origin}/url/${code}`. This guarantees preview/downloads
  use the deployed Vercel host without a public database setting.
- Use only SIC tokens/classes from `DESIGN.md`, Agrandir headings, Montserrat
  body text, approved radii, and `@phosphor-icons/react`; use clear labels such
  as “Destination link”, “Pause link”, “Scan count”, and “Download PNG”. Keep
  the existing app-selector return path rather than introducing a second
  sidebar or an imported standalone dashboard stylesheet.
- Before code review, run the required UI pre-flight: desktop and mobile,
  keyboard focus/escape, `aria-label` on icon-only controls, form validation on
  blur, unsaved-change confirmation, loading/disabled buttons, destructive
  confirmation, reduced motion, no hardcoded palette/font/icon violations,
  and visible plain-language errors.

### 6. Migrate existing Supabase link data into Neon without losing printed codes

- Create `app/scripts/export-supabase-qr-data.sql`,
  `app/scripts/import-supabase-qr-data.mjs`,
  `app/scripts/verify-qr-import.mjs`, and `docs/qr-neon-cutover.md`; modify
  `app/.env.example` to document only the temporary migration variable names.
- The export SQL runs against the old Supabase database using an operator-held
  direct database connection and emits `urls` plus `private.visit_events` with
  their ids, timestamps, status, expiry, styles, and logo URL. Do not expose
  `private.visit_events` through a public Supabase RPC just to make migration
  easier.
- The importer reads that private export and connects to Neon with the existing
  server-side `DATABASE_URL`. Require `QR_MIGRATION_ADMIN_ID`, verify it exists
  in `admins`, then insert links with their original UUID/code/timestamps,
  assign the Neon admin as creator, preserve source `view_count`, and insert
  all source visits. Make imports idempotent with `ON CONFLICT (id) DO NOTHING`
  and fail before writes if duplicate codes resolve to different ids.
- Supabase-hosted logo URLs cannot be treated as permanent dependencies. Download
  each image during import, validate/normalize it through the same QR logo
  rules, upload it to Neon `public-images`, create its `Asset`, and bind the
  resulting id; write an explicit `unmigrated-logo` report for any file that
  cannot be retrieved rather than silently retaining a Supabase URL.
- The verifier must compare source/target link count, code set, status/expiry,
  destination, style fields, aggregate scan count, and visit-event count; emit
  a non-zero exit when any comparison differs. First run export/import/verifier
  against disposable Supabase/Neon test data, then production only after the
  user reviews the dry-run report.

### 7. Cut over DNS/application behavior safely and retire Supabase only after proof

- Modify `app/.env.example` and `docs/qr-neon-cutover.md`; add
  `app/tests/e2e/qr-generator.spec.ts` if the existing authenticated Playwright
  fixture can sign in non-interactively.
- Configure the SIC-APP Vercel project with `umak-sic.vercel.app`; validate
  preview first, then production. No redirect/rewrite is needed in `vercel.json`:
  the Next route `app/url/[code]/route.ts` owns the public path.
- In staging/preview, create a new QR link, scan it from an external browser,
  verify the QR contains `/url/<code>`, confirms an HTTPS 302, reaches the
  destination, and increments one scan. Also verify an old imported code, a
  paused code, an expired code, invalid code, mobile dashboard controls, and a
  logo-bearing QR decode.
- Keep the old standalone deployment read-only until the production verification
  report shows every imported code resolving through SIC-APP. Only then either
  redirect its legacy host to the new `/url/<code>` domain or remove it, with
  explicit user approval. Remove Supabase variables/dependencies/project access
  only in that approved follow-up.

### 8. Run the release verification and preserve the audit trail

- Modify `docs/qr-neon-cutover.md` with the completed migration timestamp,
  source/target counts, environment tested, and approver; do not record secrets
  or connection strings.
- Run, in order: `pnpm db:generate`, `pnpm db:validate`, focused QR service,
  route, API, component, and integration tests, `pnpm lint`, `pnpm test`, and
  `pnpm build`. Run tests with the isolated `TEST_DATABASE_URL`; production,
  staging, and development databases are never test targets.
- Include the exact QR preview/dashboard screenshots required by
  `CONTRIBUTING.md` for a UI PR. Review the full diff for accidental Supabase
  imports, `NEXT_PUBLIC_DATABASE_URL`/credential exposure, imported Lucide or
  Geist usage, and any public route broader than `/url/[code]`.

## Acceptance Criteria

- `/qr` and all of its management screens require a valid allowlisted Neon
  administrator; `/url/<seven-letter-code>` is publicly reachable without a
  session.
- Creating a link generates a unique server-owned code and every generated QR
  encodes `https://umak-sic.vercel.app/url/<code>` in production.
- A valid active link returns a 302 redirect and atomically adds one scan to
  both its counter and visit history; invalid, paused, and expired links reveal
  neither their destination nor their metadata and return 404.
- All link settings, ownership, analytics, and logo bindings persist in Neon
  through Prisma. No production QR flow calls Supabase.
- QR logos live in SIC-APP's existing Neon public-image storage and malformed,
  private, or remote-logo values cannot be bound to a QR link.
- Existing codes, destinations, status, expiry, styles, aggregate scans, and
  historical visits are proven equal by the import verifier before cutover.
- The QR workspace follows `DESIGN.md`, uses only Phosphor icons, presents
  plain-language feedback, and works on desktop, mobile, keyboard, and reduced
motion settings.
- From `app/`, `pnpm db:validate`, `pnpm lint`, `pnpm test`, and `pnpm build`
  pass; production migration/decommission does not occur without explicit
  approval.
