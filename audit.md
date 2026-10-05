# Standards Compliance Audit — SIC App

**Date:** 2026-10-05
**Scope:** Full repository (`/home/charles/Documents/Projects/SIC/SIC-APP`), bounded to the 431 non-ignored candidates returned by `git ls-files -co --exclude-standard`. Generated output, dependencies, binary assets, vendored skill references, and ignored environment files were excluded unless they affected repository behavior.

---

## Overall Score

| Category | ERRORs | WARNINGs |
|----------|--------|----------|
| Security | 1 | 1 |
| Data Integrity | 5 | 0 |
| Performance | 0 | 3 |
| Logic | 2 | 0 |
| Code Quality | 0 | 2 |
| Error Handling | 0 | 1 |
| DevOps | 0 | 2 |
| **Total** | **8** | **9** |

The application has strong authorization boundaries, SQL parameterization, transactional domain writes, upload validation, and queue locking. It is not production-safe yet because the test harness can truncate the wrong database, email delivery is not idempotent across retries/crashes, operational logs retain student PII, and multiple operator-facing views display incorrect or fabricated state.

---

## CRITICAL — Must Fix Before Any Deployment

---

### 1. Test setup can truncate a development, staging, or production database

**Severity:** ERROR — Data Integrity
**Status:** Fixed
**Files:** `app/tests/database.ts:6-14`, `app/tests/database.ts:44-55`, `app/tests/setup.ts:7-17`, `app/vitest.config.mts:8-17`

Any non-empty `TEST_DATABASE_URL` creates a Prisma client and causes `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` before and after every test. The code does not verify a test-only database name, branch, project, hostname, marker row, or explicit destructive-test opt-in. A copied production URL or CI secret misconfiguration can erase all application data.

The cleanup error is then swallowed, so an unreachable or schema-drifted test database is treated as usable. This audit's `pnpm test` run timed out after five minutes after three integration files failed, with no useful database error emitted.

```ts
const testDatabase = testDatabaseUrl ? new PrismaClient(...) : undefined;

await testDatabase.$executeRawUnsafe(
  `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`,
);
// catch {} hides connection and schema failures
```

**Risk:** One environment-variable mistake can irreversibly destroy live data; less severe failures become opaque test hangs or contaminated test state.

**Fix:** Refuse to initialize unless the URL passes a hard test-environment guard. Require an explicit opt-in such as `ALLOW_TEST_DATABASE_TRUNCATE=yes`, reject equality with `DATABASE_URL`, validate an expected test branch/database identifier, and verify a test-only sentinel before truncation. Never swallow cleanup failures; fail the suite with the original error and database identity context (without credentials). Run database cleanup only for integration suites that actually use the database.

---

## HIGH — Fix Before Going Live

---

### 2. Email submission and dispatch are not idempotent, despite storing an idempotency key

**Severity:** ERROR — Data Integrity
**Status:** Fixed
**Files:** `app/lib/services/campaign-service.ts:108-186`, `app/lib/queue/claim-jobs.ts:39-77`, `app/lib/queue/process-jobs.ts:58-105`, `app/lib/queue/providers/brevo.ts:66-95`, `app/prisma/schema.prisma:192-214`

`submitCampaign` generates a fresh random `idempotencyKey` for every request. Repeating the same POST creates a second campaign and a second delivery per recipient, so double-clicks and network retries enqueue duplicate email.

During dispatch, the stored key is never read or sent to the provider. A worker sends to Brevo first and records success afterward. If it crashes after Brevo accepts the message, or if dispatch exceeds the five-minute lease, another worker reclaims the job and sends the same email again. Provider fetches have no timeout or lease heartbeat, making lease overlap plausible for large attachments or network stalls.

**Risk:** Students can receive duplicate announcements and QR passes while the database records only one successful attempt or two apparently independent campaigns.

**Fix:** Accept a client-generated campaign submission key and enforce it with a unique database constraint so request retries return the original campaign. Define an explicit at-least-once delivery contract if Brevo cannot accept idempotency keys; add a bounded provider timeout shorter than the lease, heartbeat/extend active leases, persist an outbound-send state before dispatch, and reconcile ambiguous provider outcomes before retrying. Remove the unused per-delivery key or make it part of that contract.

---

### 3. Recipient email addresses and subjects are written to logs

**Severity:** ERROR — Security
**Status:** Fixed
**Files:** `app/lib/queue/delivery-message.ts:225-233`, `app/lib/queue/providers/brevo.ts:100-119`, `app/lib/queue/delivery-logger.ts:58-68`

Unresolved placeholders print the full recipient email to server logs. Every provider attempt also persists `{ to, subject }` in `delivery_attempts.request_payload`. These are operational logs, not the canonical attendee/campaign records, and they duplicate PII into systems with broader access and different retention controls.

```ts
console.warn(`Delivery ${delivery.id} to ${attendee.displayEmail} ...`);
requestPayload: toLoggablePayload({ to: message.to, subject: message.subject });
```

**Risk:** Student PII and potentially sensitive campaign subjects can leak through hosting logs, database support access, backups, and exported diagnostics.

**Fix:** Log stable IDs, provider, status, and normalized error codes only. Mask addresses if correlation is unavoidable. Do not persist recipient addresses or subject text in attempt payloads; the delivery relation already identifies the recipient and campaign. Add tests that reject PII-bearing log payloads.

---

### 4. Campaign detail mixes deliveries from different campaigns and reports false status counts

**Severity:** ERROR — Logic
**Status:** Fixed
**Files:** `app/lib/services/campaign-service.ts:189-269`, `app/lib/services/campaign-service.ts:272-431`

The catalog labels each event with its latest campaign subject but derives each student's state from deliveries across every campaign. In detail view, if a roster entry has no delivery for the selected campaign, this expression substitutes an unrelated delivery:

```ts
rosterEntry.deliveries.find((d) => d.campaignId === currentCampaign.id)
  ?? rosterEntry.deliveries[0]
```

The returned status map also puts all queued and sending rows into `QUEUED`, all failed and bounced rows into `FAILED`, and hardcodes `SENDING` and `BOUNCED` to zero.

**Risk:** Operators see students as delivered, queued, or failed for the wrong announcement. They can export incorrect reports and make retry/resend decisions from false state.

**Fix:** Filter nested deliveries to the selected campaign in the database and return `NOT_SENT` when no match exists. Aggregate exact `DeliveryStatus` values with `groupBy` or filtered counts. Decide whether the catalog is an event rollup or latest-campaign view and keep subject, counts, and recipient states within that same scope.

---

### 5. The overview dashboard displays fabricated identity and attendance metrics

**Severity:** ERROR — Logic
**Status:** Fixed
**Files:** `app/app/(tabs)/overview/page.tsx:27-32`, `app/components/dashboard/stats-overview.tsx:41-59`, `app/components/dashboard/overview-events-section.tsx:140-148`, `app/components/dashboard/attendance-trend-chart.tsx:27-63`

The page always greets `Joey`, shows a static `Next October 17` subtitle, labels all-time insight totals as `Last 30 days`, and opens live check-in with `totalAttended` guessed as 60% of registration:

```tsx
Welcome back, <span>Joey!</span>
subtitle="Next October 17"
totalAttended={Math.round(checkInEvent.participants * 0.6)}
```

**Risk:** Administrative decisions are made from invented numbers, and every authenticated administrator is shown the wrong identity.

**Fix:** Load the authenticated display name, derive the next-event date from persisted events, calculate range-filtered attendance in the backend, and return actual attended counts with event data. Show a clear unavailable state rather than manufacturing a value.

---

### 6. Unchecking event attendees does not remove them from the roster

**Severity:** ERROR — Data Integrity
**Files:** `app/components/events/event-people-dialog.tsx:23-67`, `app/components/events/event-people-dialog.tsx:119-137`, `app/lib/services/event-organizer-service.ts:65-87`

The dialog loads existing attendee selections, lets the operator uncheck them, and submits the complete selected list. `saveEventPeople` only calls `eventRosterEntry.createMany(..., skipDuplicates: true)`; it never removes roster entries omitted from that list. Organizers are correctly replaced with `deleteMany` plus `createMany`, making the attendee behavior especially misleading.

**Risk:** The UI reports a successful save while removed students remain registered, continue appearing in counts, and can receive campaign emails and valid QR tickets.

**Fix:** Define the lifecycle rule explicitly. For editable rosters with no delivery/attendance history, transactionally delete omitted pending entries; for protected historical entries, reject deselection and explain why. Return the final persisted roster and test add, remove, and protected-removal behavior.

---

### 7. The five-year retention job leaves stored files indefinitely

**Severity:** ERROR — Data Integrity
**Files:** `app/lib/services/retention-service.ts:31-70`, `app/lib/storage/asset-upload.ts:104-145`, `app/prisma/schema.prisma:269-283`

Retention deletes old deliveries and roster entries and deletes/anonymizes attendees, but never handles `assets`, `campaign_assets`, event images, or the corresponding Neon Object Storage objects. The only production `DeleteObjectCommand` is upload rollback; there is no asset deletion or retention path.

**Risk:** Uploaded PDFs, images, filenames, and metadata survive past the documented five-year maximum. Deleting database rows later without deleting objects would also create orphaned storage and ongoing exposure/cost.

**Fix:** Extend retention to inventory expired/unreferenced assets, delete storage objects and metadata with retryable reconciliation, and define how event banners and campaign attachments age out. Record deletion failures for retry rather than silently leaving database/object state divergent.

---

## MEDIUM — Fix Soon

---

### 8. Practice emails bypass real provider quota accounting

**Severity:** ERROR — Data Integrity
**Files:** `app/app/api/campaigns/test-send/route.ts:11-29`, `app/app/api/campaigns/test-send/route.ts:121-159`, `app/lib/queue/quota-manager.ts:116-175`

The practice-send route calls Brevo directly and intentionally creates no quota reservation or usage record. Brevo still processes a real transactional email, so it consumes external allowance while `provider_daily_usage` remains unchanged.

**Risk:** The worker can believe capacity remains after practice sends have exhausted the provider limit, causing campaign sends to be rejected unexpectedly. The route also has no application-level cap on repeated practice sends.

**Fix:** Reserve and settle a Brevo slot for every real provider send, including practice messages, or use a provider sandbox that does not consume production quota. Add a per-admin rate limit and expose remaining allowance before sending.

---

### 9. CSV exports allow spreadsheet formula injection

**Severity:** WARNING — Security
**Files:** `app/lib/services/attendance-service.ts:77-88`, `app/components/attendees/attendee-directory.ts:211-274`, `app/app/(tabs)/events/page.tsx:92-105`, `app/app/(tabs)/campaign/[id]/page.tsx:167-187`

Exports correctly quote commas and quotes but do not neutralize cells beginning with `=`, `+`, `-`, `@`, tab, or carriage return. Attendee names, student IDs, emails, event names, venues, and provider error text can reach these cells.

**Risk:** Opening an exported file in Excel or similar software can execute attacker-controlled formulas, issue network requests, or mislead the operator.

**Fix:** Centralize one CSV encoder that prefixes dangerous leading characters with an apostrophe (or another documented spreadsheet-safe strategy) before RFC 4180 quoting. Use it for every export and test all dangerous prefixes.

---

### 10. Multiple normal write flows execute one database round trip per item

**Severity:** WARNING — Performance
**Files:** `app/lib/services/campaign-service.ts:171-183`, `app/lib/services/campaign-service.ts:438-500`, `app/lib/services/campaign-service.ts:603-626`, `app/lib/services/attendee-service.ts:356-441`, `app/lib/services/event-close-service.ts:10-38`, `app/lib/services/retention-service.ts:44-61`

Heuristic N+1 analysis found several proven write paths:

| Flow | Round-trip shape |
|------|------------------|
| Campaign submission | Base reads plus `N` delivery inserts |
| Retry/resend | One read plus `N` queue updates, with another `N` delivery updates for resend |
| Campaign asset binding | `N` upserts |
| Attendee import | Up to `N` updates plus `M` creates |
| Event closure | One event read plus up to `2N` updates |
| Retention anonymization | One read plus `N` updates |

Transactions preserve atomicity but do not remove network round trips; the Neon adapter still sends each awaited statement separately. The cost scales with recipients, imported attendees, assets, or expired events.

**Fix:** Use `createMany`/`updateMany` where rows share values, pre-generate UUIDs for bulk delivery plus queue-job inserts, use set-based SQL for per-row anonymized values, and update expired events/rosters in set-based statements. Keep per-row operations only where optimistic conditions genuinely differ, and batch those conditions where possible.

---

### 11. Campaign and overview reads overfetch and repeat whole-resource requests

**Severity:** WARNING — Performance
**Files:** `app/lib/services/campaign-service.ts:189-269`, `app/lib/services/campaign-service.ts:272-404`, `app/components/dashboard/stats-overview.tsx:11-39`, `app/components/dashboard/overview-events-section.tsx:32-56`, `app/components/dashboard/attendance-trend-chart.tsx:31-63`

`listCampaigns` loads every event, campaign, roster entry, and delivery into JavaScript without pagination. `getCampaignDetail` loads every campaign and every delivery for an event even when one campaign was requested. On the overview page, sibling components separately fetch `/api/events` twice and `/api/attendees/insights` twice on every mount.

**Risk:** Response size and server memory grow with the entire history, while the overview creates four authenticated HTTP/DB paths for two resources. The five-second campaign polling loop repeatedly pays the oversized detail-query cost.

**Fix:** Return paginated event/campaign summaries computed with database aggregates. Filter detail relations to the selected campaign and paginate recipients. Lift overview loading to the page (or a shared query cache/server component) and pass one response to child views.

---

### 12. Global attendee search lacks the index used by its correlated roster lookups

**Severity:** WARNING — Performance
**Files:** `app/prisma/migrations/20261001070000_align_search_global_attendees_signature/migration.sql:41-99`, `app/prisma/schema.prisma:124-143`

The search function checks and aggregates `event_roster_entries` by `attendee_id` for each attendee row. The table has indexes beginning with `event_id`, but no index beginning with `attendee_id`. Postgres therefore has a probable repeated scan risk for `attendedOnly`, `eventId`, and the per-page event JSON aggregation as roster history grows. `%term%` `ILIKE` predicates also cannot use ordinary B-tree indexes.

**Risk:** Directory search and filtering can degrade sharply with attendee and roster volume even though only 25 rows are returned.

**Fix:** Add a forward migration with an index such as `(attendee_id, event_id, status)` based on `EXPLAIN (ANALYZE, BUFFERS)` results. Consider `pg_trgm` indexes for bounded substring search if real data confirms that scan cost is material.

---

### 13. Frontend code repeatedly violates the repository's mandatory design tokens

**Severity:** WARNING — Code Quality
**Files:** `app/components/dashboard/attendance-trend-chart.tsx:65-183`, `app/components/dashboard/students-registered-card.tsx:22-46`, `app/components/events/clock-picker.tsx:151-208`, `app/components/events/event-schedule-picker.tsx:168-299`, `app/components/attendees/profile-circle.tsx:12-50`, `app/components/ui/button.tsx:8-29`

The repository charter requires named color tokens and only the documented pixel radius scale. The UI contains widespread hardcoded hex/Tailwind palettes (`#2da482`, `slate-*`, `emerald-*`, `bg-white`), gradients with ad-hoc colors, and unsupported radius aliases (`rounded-md`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`). The lint run also reports 22 warnings, including unused production props and helpers.

**Risk:** Theme behavior and visual consistency drift across screens; changing a brand token does not update these components, and shared primitives propagate non-compliant radii everywhere.

**Fix:** Replace ad-hoc values with `--ink`, `--cyan`, `--canvas`, `--paper`, `--muted`, and semantic feedback tokens. Normalize radii to the allowed pixel scale in shared primitives first, then feature components. Add lint/style checks that reject hardcoded palette utilities, hex colors, and unsupported radius classes.

---

## LOW — Should Fix

---

### 14. Large client components combine unrelated state, networking, rendering, and export logic

**Severity:** WARNING — Code Quality
**Files:** `app/components/campaign/campaign-recipients-step.tsx` (1,180 lines), `app/components/campaign/campaign-assets-step.tsx` (800+ lines), `app/app/(tabs)/campaign/[id]/page.tsx` (580 lines), `app/lib/services/campaign-service.ts` (661 lines)

These files own multiple workflows and change for unrelated reasons. The campaign detail page, for example, owns polling, retry, resend, pass generation, CSV export, filtering, sorting, KPIs, three tabs, and four dialogs. `campaign-service.ts` combines submission, catalog reads, detail reads, retry/resend, and asset binding.

**Risk:** Small changes carry broad regression and merge-conflict risk, while focused behavior is difficult to test independently.

**Fix:** Split by cohesive behavior, not arbitrary line count: campaign queries, campaign submission, delivery retry/resend, asset binding, and page-level hooks/dialogs. Keep orchestration at the route/page boundary and preserve existing side effects during extraction.

---

### 15. Raw provider failure prose is stored and rendered directly to operators

**Severity:** WARNING — Error Handling
**Files:** `app/lib/queue/providers/brevo.ts:122-143`, `app/lib/queue/delivery-logger.ts:97-115`, `app/app/(tabs)/campaign/[id]/page.tsx:493-548`

Brevo's arbitrary `message` field is appended to `errorMessage`, stored in `failureMessage`/`lastError`, and rendered verbatim in the UI. This exposes provider terminology and can produce unstable, overly technical, or inappropriate operator copy.

**Risk:** Operators receive messages they cannot act on, while provider response changes become accidental UI contract changes.

**Fix:** Map known HTTP statuses/provider codes to stable internal reason codes and plain-language messages. Keep sanitized diagnostic detail in restricted telemetry only, without recipient PII.

---

### 16. The current production build is not cleanly reproducible after route removal

**Severity:** WARNING — DevOps
**Files:** `app/package.json:5-21`, `app/tsconfig.json:25-32`

`pnpm build` compiled but failed type checking because `.next/dev/types/validator.ts` still referenced the removed `app/events/[id]/attendance/page.js`. The generated `.next` tree is ignored, so this is not a committed-source violation, but the standard build command does not clear stale development type output before validating.

**Risk:** A developer can be blocked by a false build failure after moving/removing routes, and local verification no longer matches a clean CI checkout.

**Fix:** Document the supported cleanup (`rm -rf .next`) or add a safe clean-build script used for release verification. Prefer fixing the Next/type-generation workflow over permanently deleting caches on every incremental build.

---

### 17. Root tooling duplicates the real app with conflicting package state

**Severity:** WARNING — DevOps
**Files:** `package.json:1-35`, `package-lock.json`, `pnpm-lock.yaml`, `.gitignore:13-16`, `hello.ts`, `neon.ts`

The deployable app is under `app/` and pins Next 16/pnpm 11, while the repository root carries a second Next 15 package manifest, an npm lockfile, a pnpm lockfile, generated `tsconfig.tsbuildinfo`, and orphan preview files. The `.gitignore` comment says npm lockfiles are unwanted but ignores only `app/package-lock.json`, leaving the root npm lock tracked.

**Risk:** Contributors and automation can install or audit the wrong dependency graph, report conflicting vulnerabilities, or run stale preview code instead of the application.

**Fix:** Remove the obsolete root package/tooling and preview files if they have no supported entry point, or formalize a pnpm workspace with one lockfile and explicit packages. Ignore generated TypeScript build info.

---

## Files With Zero Violations

- `app/lib/auth/require-admin.ts`
- `app/lib/auth/require-queue-worker.ts`
- `app/lib/security/qr-signer.ts`
- `app/lib/email/markdown-compiler.ts`
- `app/lib/storage/upload-validation.ts`
- `app/lib/services/roster-service.ts`
- `app/lib/services/ingestion/conflict-service.ts`
- `app/lib/services/ingestion/import-request.ts`
- `app/prisma/migrations/20260930120000_align_campaign_assets_with_dma_13/migration.sql`
- `.github/workflows/ci.yml`

---

## Things that we're done correctly

- `app/lib/auth/require-admin.ts:7-24` checks both the Neon Auth session and the database allowlist before returning an administrator identity; API routes consistently use it.
- `app/proxy.ts:31-60` uses deny-by-default page protection while deliberately leaving API routes to return JSON 401/403 responses.
- `app/lib/security/qr-signer.ts:144-202` verifies the HMAC before parsing ticket content and uses `timingSafeEqual` with explicit event/window rejection reasons.
- `app/lib/email/markdown-compiler.ts:130-190` sanitizes Markdown with narrow tag, attribute, scheme, and image-host allowlists.
- `app/lib/storage/upload-validation.ts:61-112` bounds upload sizes and verifies image contents through Sharp instead of trusting only the client MIME header.
- `app/lib/queue/claim-jobs.ts:37-78` atomically claims jobs with `FOR UPDATE SKIP LOCKED` and changes delivery state in the same SQL statement.
- `app/lib/queue/quota-manager.ts:127-156` reserves quota with a guarded atomic update, preventing two workers from taking the final slot.
- `app/lib/services/checkin-service.ts:38-66` uses a conditional atomic transition so concurrent scans cannot both create a first check-in.
- `app/lib/services/ingestion/import-request.ts:5-14` rebuilds import previews server-side rather than trusting client-supplied overwrite instructions.
- `app/prisma/migrations/20260927000000_init/migration.sql:150-178` establishes foreign keys, domain checks, and append-only delivery-attempt triggers.

---

## Priority Fix Roadmap

### P0 — Safety and Trust

| # | Issue | File(s) |
|---|-------|---------|
| 1 | Add hard test-database identity guards and stop swallowing cleanup failures | `app/tests/database.ts`, `app/vitest.config.mts` |
| 2 | Remove recipient PII and campaign subjects from operational logs | `delivery-message.ts`, `brevo.ts`, `delivery-logger.ts` |
| 3 | Make campaign submission retry-safe and harden worker dispatch against duplicate sends | `campaign-service.ts`, queue modules, provider adapter |

### P1 — Correct Operator State

| # | Issue | File(s) |
|---|-------|---------|
| 4 | Scope campaign deliveries/counts to the selected campaign | `campaign-service.ts` |
| 5 | Replace fabricated overview identity and metrics with persisted values | overview/dashboard components |
| 6 | Persist attendee deselection or reject it explicitly | `event-people-dialog.tsx`, `event-organizer-service.ts` |
| 7 | Include storage objects and asset metadata in retention | `retention-service.ts`, storage service |
| 8 | Count practice sends against real provider quota | test-send route, `quota-manager.ts` |

### P2 — Security and Scale

| # | Issue | File(s) |
|---|-------|---------|
| 9 | Neutralize spreadsheet formulas in every CSV export | attendance/campaign/event/attendee exports |
| 10 | Replace per-item writes with set-based/batched operations | campaign, attendee, retention, event-close services |
| 11 | Paginate campaign data and deduplicate overview requests | campaign service, overview components |
| 12 | Add the roster attendee lookup index after plan validation | Prisma schema and forward migration |

### P3 — Maintainability and Delivery

| # | Issue | File(s) |
|---|-------|---------|
| 13 | Bring frontend colors and radii onto required tokens | shared UI and feature components |
| 14 | Split campaign modules along cohesive behavior boundaries | campaign page/components/service |
| 15 | Map provider failures to stable plain-language messages | provider adapter and campaign UI |
| 16 | Make clean builds reproducible and remove duplicate root tooling | build scripts, root package files |

---

*Generated by repository audit on 2026-10-05. Heuristic N+1 and repeated HTTP/database round-trip analysis was included. Verification: `pnpm lint` completed with 22 warnings; `pnpm test` did not complete within five minutes and showed three failing integration files; `pnpm build` compiled but failed on a stale ignored `.next/dev/types` route reference.*
