# Task Traceability Matrix (TTM): SIC Admin App

## Overview

This document provides bidirectional traceability between product requirements in the PRD, architectural specifications in the Data Model Addendum, and atomic implementation tasks executed in the SIC Next.js application and queue components.

### Status Legend
- `[ ] Planned` — Not yet started
- `[/] In Progress` — Currently active
- `[x] Completed` — Implemented and verified by passing automated tests
- `[-] Blocked` — Waiting on dependencies or human input

---

## Forward Traceability Matrix (Grouped by Epic)

### EPIC-01: Foundation, Infrastructure & Database Schema
**Target Subsystem**: `Root & Database` | **Scope**: Prisma ORM, Neon PostgreSQL configuration, complete schema modeling the Data Model Addendum, migration scripts, and unified testing harness.

| Task ID | Description | Target Component | PRD / Contract Mapping | Verification Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-0101** | Initialize Prisma ORM, Neon database connection pooling, and package scripts | `app/prisma`, `app/package.json` | Implementation Decisions | `npx prisma -v` runs cleanly; connection string successfully resolves Neon pooler. | `[ ] Planned` |
| **TSK-0102** | Define complete Prisma schema matching Data Model Addendum (`admins`, `attendees`, `events`, `event_roster_entries`, `campaigns`, `email_deliveries`, `queue_jobs`, `delivery_attempts`, `provider_daily_usage`, `assets`) | `app/prisma/schema.prisma` | DMA-01, DMA-02, DMA-03, DMA-04, DMA-08, DMA-09, DMA-10, DMA-11 | `npx prisma validate` passes; schema models all required foreign keys, enums, and unique constraints. | `[ ] Planned` |
| **TSK-0103** | Generate and apply initial database migrations against Neon | `app/prisma/migrations` | Implementation Decisions | `prisma migrate deploy` executes up/down migrations without error. | `[ ] Planned` |
| **TSK-0104** | Configure test runner (Vitest) with database seed/clean utilities and transactional test environment | `app/tests/setup.ts`, `app/vitest.config.mts` | Testing Decisions | Test command `pnpm test` executes and reports passing test runner sanity check. | `[ ] Planned` |
| **TSK-0105** | Decide whether the `neon.ts` preview function is still needed, and either give it a real entry point or remove it | `neon.ts`, `hello.ts` | Implementation Decisions, NFR-01 | `neon.ts` either declares a function the project runs, with a real entry point, or no longer declares one | `[ ] Planned` |

---

### EPIC-02: Authentication & Administrator Authorization
**Target Subsystem**: `Auth & Route Protection` | **Scope**: Neon Managed Better Auth integration, single-admin authorization mapping (`neon_auth_user_id`), Next.js route protection, and access denial.

| Task ID | Description | Target Component | PRD / Contract Mapping | Verification Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-0201** | Enable Neon Managed Better Auth and configure `@neondatabase/auth` with environment values, catch-all auth handler, and email/password sign-in flow | `app/app/(auth)`, `app/app/api/auth/[...path]/route.ts`, `app/lib/auth/server.ts`, `app/proxy.ts` | US-01, DMA-01 | Unauthenticated visitors attempting to access admin routes are redirected to the Neon Auth sign-in route; a valid email/password session is established. | `[x] Completed` |
| **TSK-0202** | Implement admin authorization guard validating the Neon Auth session user against Neon `admins` (`neon_auth_user_id`) | `app/lib/auth/require-admin.ts`, `app/proxy.ts` | US-01, US-02, DMA-01 | Authorized admin session resolves successfully; an authenticated non-admin receives 403 response. | `[x] Completed` |
| **TSK-0203** | Build unauthorized access denial page with clear operator messaging | `app/app/unauthorized/page.tsx` | US-02 | Non-allowlisted user sees access-denied screen with no admin navigation or confidential data rendered. | `[ ] Planned` |

---

### EPIC-03: Neon Object Storage & Asset Management
**Target Subsystem**: `Storage & Asset Service` | **Scope**: S3-compatible Neon Object Storage client, upload API route with MIME/size validation, and metadata persistence in `assets`.

| Task ID | Description | Target Component | PRD / Contract Mapping | Verification Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-0301** | Implement AWS S3 SDK client configured for Neon Object Storage | `app/lib/storage/neon-storage-client.ts` | US-14, NFR-03 | S3 client instantiates with Neon-injected credentials without exposing secrets to client. | `[ ] Planned` |
| **TSK-0302** | Build administrator-only public/private asset upload API routes with PNG/JPEG/WebP to WebP conversion, PDF validation, and size limits | `app/app/api/assets/` | US-14, DMA-11 | Unauthorized uploads return 401/403; invalid media returns 400; valid images upload as WebP and PDFs upload to the selected Neon Object Storage bucket. | `[x] Completed` |
| **TSK-0303** | Persist uploaded asset metadata (bucket, key, original filename, media type, byte size, uploader reference) in `assets` | `app/lib/services/asset-service.ts` | DMA-11 | Database record in `assets` matches uploaded file properties and returns stable asset UUID reference. | `[x] Completed` |

---

### EPIC-04: Event Management & Lifecycle Automation
**Target Subsystem**: `Event Domain & Scheduling` | **Scope**: Event CRUD (draft, published, closed), single organization timezone formatting, banner asset binding, event closure scheduler endpoint authenticated via secret header.

| Task ID | Description | Target Component | PRD / Contract Mapping | Verification Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-0401** | Implement Event domain service managing draft, published, and closed lifecycle transitions | `app/lib/services/event-service.ts` | US-03, US-04, US-05, DMA-03 | Event created as draft; publishing validates required fields; closed state prevents editing. | `[x] Completed` |
| **TSK-0402** | Build admin event management UI (list, create/edit form, image upload, timezone-aware datetime picker) | `app/app/events/page.tsx`, `app/components/events/` | US-03, US-04, US-05 | Admin creates and edits event; UI displays organization timezone and links uploaded Neon Object Storage banner. | `[ ] Planned` |
| **TSK-0403** | Implement `/api/cron/close-events` endpoint secured by dedicated high-entropy secret header | `app/app/api/cron/close-events/route.ts` | US-06, DMA-06 | Requests without `X-Cron-Secret` header return 401 Unauthorized; valid requests trigger closure logic. | `[x] Completed` |
| **TSK-0404** | Implement event closure transition updating expired events to `closed` and pending roster entries to `absent` | `app/lib/services/event-close-service.ts` | US-06, DMA-04, DMA-06 | Events past `ends_at` transition to `closed`; all `pending` roster entries atomically update to `absent`. | `[x] Completed` |

---

### EPIC-05: Attendee Registry & Recipient Ingestion Engine
**Target Subsystem**: `Attendee Ingestion & Deduplication` | **Scope**: Attendee CRUD, CSV ingestion parser, manual text/list parser, past attendee selector, normalization, deduplication, conflict preview and approved overwrite logic.

| Task ID | Description | Target Component | PRD / Contract Mapping | Verification Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-0501** | Implement email normalization utility (trim, lowercase) and required unique `student_id` validation | `app/lib/validation/attendee-validation.ts` | US-10, US-11, DMA-02 | Unit tests assert invalid emails/IDs return descriptive error; normalized emails match case-insensitively. | `[x] Completed` |
| **TSK-0502** | Build recipient ingestion parsers for CSV files and pasted comma/line/list delimited inputs | `app/lib/services/ingestion/parser.ts` | US-07, US-09, US-10 | Parser reports row-by-row syntax errors and extracts name, email, student ID cleanly. | `[x] Completed` |
| **TSK-0503** | Build conflict preview service detecting existing student IDs and normalized emails against Neon `attendees` | `app/lib/services/ingestion/conflict-service.ts` | DMA-02 | Ingestion staging identifies existing records vs new records and previews proposed attribute changes. | `[x] Completed` |
| **TSK-0504** | Implement attendee upsert transaction executing approved conflict overwrites | `app/lib/services/attendee-service.ts` | DMA-02 | On admin approval, existing attendee records overwrite fields while preserving UUIDs; new attendees created. | `[x] Completed` |
| **TSK-0505** | Build recipient selector component filtering prior event attendees for new campaign inclusion | `app/components/recipients/PastAttendeeSelector.tsx` | US-08 | Admin can search, filter, and multi-select attendees who attended previous events into a new recipient list. | `[ ] Planned` |
| **TSK-0506** | Decide the `student_id` policy for pasted address-only imports and amend DMA-02 accordingly | `app/lib/services/attendee-service.ts`, `docs/traceability-matrix.md` | DMA-02, US-07, US-09 | `student_id` stays NOT NULL and unique; pasted input resolves only against existing attendees, and new attendees must arrive by CSV carrying a student ID and a full name | `[x] Completed` |

---

### EPIC-06: Email Composer, Markdown Engine & QR Ticket Generation
**Target Subsystem**: `Email Composition & QR Cryptography` | **Scope**: Markdown composer with image insertion, secure HTML renderer, HMAC-SHA256 opaque QR ticket generator, recipient-aware preview, single-recipient test send.

| Task ID | Description | Target Component | PRD / Contract Mapping | Verification Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-0601** | Implement safe Markdown-to-HTML compiler supporting headings, code blocks, blockquotes, and Neon Object Storage images | `app/lib/email/markdown-compiler.ts` | US-12, US-13, US-14 | Unit tests verify Markdown renders structured HTML with sanitized tags and embedded Neon Object Storage image links. | `[x] Completed` |
| **TSK-0602** | Implement HMAC-SHA256 signed QR ticket generator and validator bound to `(event_id, roster_entry_id)` | `app/lib/security/qr-signer.ts` | US-15, DMA-07 | Signed token contains no raw email/internal ID; verification validates signature and check-in window expiry. | `[x] Completed` |
| **TSK-0603** | Implement QR code image renderer converting signed ticket into embedded email CID image / data URL | `app/lib/email/qr-image-generator.ts` | US-15 | Generates readable QR code image buffer containing only the opaque signed token. | `[x] Completed` |
| **TSK-0604** | Build email composer UI with recipient preview drawer rendering personalized Markdown, image, and QR code | `app/app/campaigns/new/page.tsx`, `app/components/email/` | US-12, US-16 | Preview reflects selected recipient attributes, rendered HTML markup, and dynamic QR ticket placement. | `[ ] Planned` |
| **TSK-0605** | Implement single-address test send action executing immediate dispatch via provider client | `app/app/api/campaigns/test-send/route.ts` | US-17 | Test email successfully delivers to specified test address without enqueuing batch roster jobs. | `[ ] Planned` |
| **TSK-0606** | Decide the `QR_TICKET_SECRET` rotation policy and document a safe runbook | `app/.env.example`, `app/.env.test.example` | DMA-05, DMA-07 | A rotation policy is recorded and a runbook states how to rotate without invalidating a live event's tickets | `[ ] Planned` |
| **TSK-0607** | Define `campaign_assets` with a DMA entry, and own binding an asset to a campaign | `app/prisma/schema.prisma`, `docs/traceability-matrix.md` | DMA-11, US-14, US-16 | A DMA entry describes the table and its roles, a task owns the binding, and TSK-0604 can be built against a defined model | `[x] Completed` |
| **TSK-0608** | Apply the DMA-13 `campaign_assets` schema changes and implement the asset-binding write path | `app/prisma/schema.prisma`, `app/prisma/migrations`, `app/lib/services/campaign-service.ts` | DMA-11, DMA-13, US-14, US-16 | The `header` role and `position` column are removed, `created_at` is added, `UNIQUE (campaign_id, asset_id)` is enforced, and a campaign can bind and read back its inline and attachment assets | `[ ] Planned` |

---

### EPIC-07: Delivery Queue & Dual Provider Failover
**Target Subsystem**: `Next.js queue worker` | **Scope**: First-party Next.js queue API and background worker, shared-secret authentication, transactional `provider_daily_usage` quota reservation, Mailgun HTTP API adapter, Brevo HTTP API adapter, retry mechanism, and delivery attempt logging.

| Task ID | Description | Target Component | PRD / Contract Mapping | Verification Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-0701** | Build Next.js queue worker API with shared-secret authentication | `app/app/api/internal/queue-jobs/route.ts`, `app/lib/auth/require-queue-worker.ts` | US-18, NFR-01 | `POST /api/internal/queue-jobs` requests without a valid `X-Queue-Worker-Secret` return 401 before parsing their body; authenticated requests enqueue jobs to `queue_jobs` idempotently. | `[x] Completed` |
| **TSK-0702** | Implement Next.js worker job claim engine with `SKIP LOCKED` row-level database locking | `app/lib/queue/claim-jobs.ts`, `app/lib/queue/process-jobs.ts` | US-18, DMA-09 | A transaction claims scheduled or expired-lease jobs with `SKIP LOCKED`; concurrent workers cannot claim the same job, and each claim gets a five-minute lease. | `[x] Completed` |
| **TSK-0703** | Implement Mailgun HTTP API client adapter respecting daily quota (default 100/day) | `app/lib/queue/providers/mailgun.ts` | US-21, NFR-02 | Dispatches email via Mailgun HTTP endpoint; correctly handles 200 OK and error responses without using SMTP. | `[ ] Planned` |
| **TSK-0704** | Implement Brevo HTTP API client adapter for overflow delivery (default 300/day) | `app/lib/queue/providers/brevo.ts` | US-22, NFR-02 | Dispatches email via Brevo transactional HTTP API when selected by failover engine without using SMTP. | `[ ] Planned` |
| **TSK-0705** | Implement transactional `provider_daily_usage` quota reservation and automatic Mailgun $\to$ Brevo failover | `app/lib/queue/quota-manager.ts` | US-21, US-22, DMA-10, NFR-05 | Unit tests assert Mailgun is used for first 100 sends; switches to Brevo for next 300; limits are configurable. | `[ ] Planned` |
| **TSK-0706** | Move queue jobs to a dead-letter state after retries exceed the configured limit | `app/lib/queue/delivery-logger.ts`, `app/lib/queue/process-jobs.ts` | US-23, DMA-10 | A failed job remains queued through its configured retries; when `retry_count > max_retries`, its queue job becomes `dead_letter` and its delivery becomes `failed`. | `[/] In Progress` |
| **TSK-0707** | Implement immutable `delivery_attempts` logging and `email_deliveries` status transition updates | `app/lib/queue/claim-jobs.ts`, `app/lib/queue/delivery-logger.ts`, `app/lib/queue/process-jobs.ts` | US-19, US-20, DMA-08, DMA-09 | Every provider attempt is logged transactionally; claimed deliveries transition to `sending`, a successful provider response updates the delivery to `sent`, and a dead-lettered delivery becomes `failed`. | `[/] In Progress` |

TSK-0702's concurrent-claim test passes against the isolated test database. CI accepts either `TEST_DATABASE_URL` or `NEON_TEST_DATABASE_URL`; the test harness truncates application tables, so neither secret may reference dev, staging, or production.

TSK-0706 and TSK-0707 have a tested worker core, but remain in progress until TSK-0703 through TSK-0705 provide a production dispatch implementation.

---

### EPIC-08: Campaign Management & Delivery Dashboard
**Target Subsystem**: `Campaign Management UI` | **Scope**: Campaign creation bound to event and roster entries, submission to the delivery queue, live campaign metrics dashboard, per-recipient failure detail modal, safe retry dispatch.

| Task ID | Description | Target Component | PRD / Contract Mapping | Verification Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-0801** | Implement campaign submission workflow linking attendees as `event_roster_entries`, creating `campaigns`, and enqueuing `email_deliveries` | `app/lib/services/campaign-service.ts` | US-18, DMA-04, DMA-08 | Submitting campaign creates roster entries, email delivery rows, and queue jobs in one atomic transaction. | `[ ] Planned` |
| **TSK-0802** | Build campaign delivery monitoring view showing real-time queued, sending, sent, and failed progress counters | `app/app/campaigns/[id]/page.tsx` | US-19 | UI renders live breakdown of counts matching underlying `email_deliveries` states. | `[ ] Planned` |
| **TSK-0803** | Build per-recipient failure detail drawer and safe retry action for failed deliveries | `app/components/campaigns/FailureDetailModal.tsx` | US-20 | Admin inspects provider error details; triggering retry enqueues only failed recipients without resending to sent. | `[ ] Planned` |

---

### EPIC-09: Mobile Web Check-in & Real-Time Attendance
**Target Subsystem**: `Check-in & Live Attendance` | **Scope**: Mobile camera scanner view, ticket verification API, duplicate scan detection reporting original arrival time, live attendance table with search, CSV export.

| Task ID | Description | Target Component | PRD / Contract Mapping | Verification Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-0901** | Build mobile-responsive camera QR scanner interface with camera permission handling and scan overlay | `app/app/checkin/page.tsx`, `app/components/scanner/` | US-24 | Requesting camera permission activates video feed; successfully reads encoded QR payload from mobile browser. | `[ ] Planned` |
| **TSK-0902** | Implement check-in API route verifying HMAC signature, event matching, and valid check-in window (2h before start $\to$ 2h after end) | `app/app/api/checkin/scan/route.ts` | US-25, US-27, DMA-05, DMA-07 | Rejects tampered, expired, or mismatched tickets with distinct error reasons (malformed, expired, wrong_event). | `[ ] Planned` |
| **TSK-0903** | Implement atomic attendance check-in transitioning roster entry to `attended`, setting `arrived_at` and `scanned_by_admin_id` | `app/lib/services/checkin-service.ts` | US-25, DMA-04 | Valid scan updates roster entry status to `attended` and records current timestamp atomically. | `[ ] Planned` |
| **TSK-0904** | Implement duplicate scan handler detecting already attended entries and reporting original check-in timestamp | `app/lib/services/checkin-service.ts` | US-26 | Scanning an already-checked-in ticket returns status `duplicate` with the original `arrived_at` timestamp. | `[ ] Planned` |
| **TSK-0905** | Build live event attendance view with searchable roster, real-time checked-in totals, and CSV export | `app/app/events/[id]/attendance/page.tsx` | US-28, US-29 | Real-time counts reflect live arrivals; search filters attendees; CSV export downloads complete attendance dataset. | `[ ] Planned` |

---

### EPIC-10: Security, Retention & End-to-End Verification
**Target Subsystem**: `Compliance & E2E Testing` | **Scope**: 5-year data retention cleanup worker, credential isolation auditing, provider test fakes, end-to-end admin workflow tests.

| Task ID | Description | Target Component | PRD / Contract Mapping | Verification Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-1001** | Implement scheduled data retention policy purging/anonymizing records older than 5 years | `app/lib/services/retention-service.ts` | DMA-12 | Running retention job deletes or anonymizes attendee and delivery records past 5-year threshold. | `[ ] Planned` |
| **TSK-1002** | Implement deterministic mock/fake adapters for Neon Auth, Mailgun, Brevo, and Neon Object Storage | `app/tests/fakes/` | Testing Decisions, NFR-04 | Full test harness runs offline without live cloud credentials. | `[ ] Planned` |
| **TSK-1003** | Implement end-to-end automated test suite covering full admin workflow (event $\to$ campaign $\to$ scan $\to$ CSV) | `app/tests/e2e/workflow.spec.ts` | Testing Decisions | Playwright E2E executes sign-in, event publish, recipient import, campaign send, QR check-in, and export. | `[ ] Planned` |

---

## Reverse Traceability Matrix (Requirements to Tasks)

Verifies that every requirement defined in the PRD, Data Model Addendum, and Non-Functional Architecture has associated tasks and verification criteria.

### User Stories (PRD)

| Requirement ID | Requirement Summary | Assigned Task ID(s) | Verification Status |
| :--- | :--- | :--- | :--- |
| **US-01** | Allowlisted administrator email/password sign-in | TSK-0201, TSK-0202 | `[ ] Planned` |
| **US-02** | Unauthorized users denied access | TSK-0202, TSK-0203 | `[ ] Planned` |
| **US-03** | Create event with details, image, time, org timezone | TSK-0401, TSK-0402 | `[ ] Planned` |
| **US-04** | Save event as draft | TSK-0401, TSK-0402 | `[ ] Planned` |
| **US-05** | Publish completed event for QR campaign & check-in | TSK-0401, TSK-0402 | `[ ] Planned` |
| **US-06** | Event closes after end time, blocking expired tickets | TSK-0403, TSK-0404 | `[ ] Planned` |
| **US-07** | Import recipient emails from CSV | TSK-0502 | `[ ] Planned` |
| **US-08** | Select past attendees as recipients | TSK-0505 | `[ ] Planned` |
| **US-09** | Paste recipients as comma, line break, or list | TSK-0502 | `[ ] Planned` |
| **US-10** | Reject malformed emails with actionable feedback | TSK-0501, TSK-0502 | `[ ] Planned` |
| **US-11** | Recipient emails normalized and deduplicated case-insensitively | TSK-0501 | `[ ] Planned` |
| **US-12** | Email composer with subject and Markdown body | TSK-0601, TSK-0604 | `[ ] Planned` |
| **US-13** | Markdown blocks safely rendered to email HTML | TSK-0601 | `[ ] Planned` |
| **US-14** | Neon Object Storage image upload (header, inline, attachments) | TSK-0301, TSK-0302, TSK-0303 | `[ ] Planned` |
| **US-15** | Recipient email contains event-specific opaque QR code | TSK-0602, TSK-0603 | `[ ] Planned` |
| **US-16** | Rendered email preview with selected recipient data | TSK-0604 | `[ ] Planned` |
| **US-17** | Send test email to single email address | TSK-0605 | `[ ] Planned` |
| **US-18** | Submit batch campaign to durable delivery queue | TSK-0701, TSK-0702, TSK-0801 | `[ ] Planned` |
| **US-19** | Campaign dashboard with queued, sending, sent, failed counts | TSK-0707, TSK-0802 | `[ ] Planned` |
| **US-20** | Per-recipient failure details and safe retries without duplicates | TSK-0707, TSK-0803 | `[ ] Planned` |
| **US-21** | Primary delivery via Mailgun up to daily quota (100) | TSK-0703, TSK-0705 | `[ ] Planned` |
| **US-22** | Failover to Brevo for remaining capacity up to quota (300) | TSK-0704, TSK-0705 | `[ ] Planned` |
| **US-23** | Hold unsent work in queue when both quotas exhausted | TSK-0706 | `[ ] Planned` |
| **US-24** | Mobile web camera scan for QR tickets | TSK-0901 | `[ ] Planned` |
| **US-25** | Valid ticket scan records single attendance | TSK-0902, TSK-0903 | `[ ] Planned` |
| **US-26** | Duplicate scan reports original check-in timestamp | TSK-0904 | `[ ] Planned` |
| **US-27** | Clear rejection for expired, malformed, or mismatched tickets | TSK-0902 | `[ ] Planned` |
| **US-28** | Live checked-in counts and searchable attendance list | TSK-0905 | `[ ] Planned` |
| **US-29** | Export event attendance to CSV | TSK-0905 | `[ ] Planned` |

---

### Data Model Addendum & Architectural Rules

| Requirement ID | Requirement Summary | Assigned Task ID(s) | Verification Status |
| :--- | :--- | :--- | :--- |
| **DMA-01** | `admins` table keyed by `neon_auth_user_id`; exactly one record; credentials and sessions owned by Neon Managed Better Auth in `neon_auth` | TSK-0102, TSK-0201, TSK-0202 | `[ ] Planned` |
| **DMA-02** | `attendees` table with UUID PK, normalized email, display email, required name, required unique `student_id`; conflict preview and overwrite | TSK-0102, TSK-0501, TSK-0503, TSK-0504, TSK-0506 | `[ ] Planned` |
| **DMA-03** | `events` table with UUID PK, name, details, Neon Object Storage banner ref, UTC timestamps, org timezone display, status | TSK-0102, TSK-0401, TSK-0402 | `[ ] Planned` |
| **DMA-04** | `event_roster_entries` replaces standalone attendance; unique `(event_id, attendee_id)`, status: `pending` \| `attended` \| `absent`, `arrived_at`, `scanned_by_admin_id` | TSK-0102, TSK-0801, TSK-0903 | `[ ] Planned` |
| **DMA-05** | Check-in window rule: scan accepted 2 hours before `starts_at` until 2 hours after `ends_at` | TSK-0602, TSK-0606, TSK-0902 | `[ ] Planned` |
| **DMA-06** | Event-close scheduler calls endpoint with high-entropy secret; marks still-pending entries `absent` | TSK-0403, TSK-0404 | `[ ] Planned` |
| **DMA-07** | Opaque HMAC-signed QR tickets bound to roster entry & event; expire after check-in window; no reissue in v1 | TSK-0602, TSK-0603, TSK-0606, TSK-0902 | `[ ] Planned` |
| **DMA-08** | `campaigns` & `email_deliveries` (`queued` \| `sending` \| `sent` \| `bounced` \| `failed`) | TSK-0102, TSK-0707, TSK-0801 | `[ ] Planned` |
| **DMA-09** | `queue_jobs` (worker mechanics, lock state, retries) & `delivery_attempts` (immutable HTTP log) | TSK-0102, TSK-0702, TSK-0707 | `[ ] Planned` |
| **DMA-10** | `provider_daily_usage` transactional quota tracking & reservation (Mailgun $\to$ Brevo $\to$ hold) | TSK-0102, TSK-0705, TSK-0706 | `[ ] Planned` |
| **DMA-11** | `assets` table for Neon Object Storage object keys, original filename, media type, byte size, upload metadata | TSK-0102, TSK-0302, TSK-0303, TSK-0607 | `[ ] Planned` |
| **DMA-12** | Data retention rule: 5-year maximum retention, then delete or anonymize | TSK-1001 | `[ ] Planned` |
| **DMA-13** | `campaign_assets` links uploaded assets to a campaign with an `inline` / `attachment` role; no `header` role and no `position` column | TSK-0102, TSK-0607, TSK-0608 | `[ ] Planned` |

---

### Non-Functional & Operational Requirements (NFR)

| Requirement ID | Requirement Summary | Assigned Task ID(s) | Verification Status |
| :--- | :--- | :--- | :--- |
| **NFR-01** | First-party Next.js queue API and worker with shared-secret authentication | TSK-0701 | `[ ] Planned` |
| **NFR-02** | HTTP APIs only for email delivery; SMTP is not used | TSK-0703, TSK-0704 | `[ ] Planned` |
| **NFR-03** | Zero-trust client security: browser clients never access provider credentials or Neon Object Storage access keys | TSK-0301, TSK-0302 | `[ ] Planned` |
| **NFR-04** | Deterministic mock/fake adapters for Neon Auth, Mailgun, Brevo, and Neon Object Storage | TSK-1002 | `[ ] Planned` |
| **NFR-05** | Configurable provider quotas (configurable environment limits for Mailgun & Brevo) | TSK-0705 | `[ ] Planned` |
| **NFR-06** | Single organization timezone support across display formatting and check-in bounds | TSK-0401, TSK-0402, TSK-0902 | `[ ] Planned` |

---

## Data Model Detail

Requirements whose schema needs more than a summary line live here. Each section
records the decided contract, not a draft.

### DMA-02: attendee enrollment path

DMA-02 itself is unchanged: `attendees.student_id` remains `NOT NULL` and
globally unique. What follows is the import behaviour that constraint implies,
recorded so the ingestion engine and the recipient selector agree on it.

- **CSV import** is the only way to create an attendee. A new row must carry a
  valid `student_id` and a full name.
- **Pasted input** resolves exclusively against existing `attendees` rows. A
  pasted address that matches no existing attendee is rejected with an explicit
  error directing the administrator to enroll the person by CSV.
- A row missing either a `student_id` or a `name` is rejected. A `name` is never
  defaulted to the email address, since the error message promises a full name.
- Rejection is per row. One unmatched pasted address does not discard the rest of
  the batch, matching the row-level error surface TSK-0502 already provides.

This makes TSK-0505 a selector over existing attendees, which is what its stated
scope already describes.

### DMA-13: `campaign_assets`

Links uploaded Neon Object Storage assets to a campaign.

| Column | Type | Rule |
| :--- | :--- | :--- |
| `id` | UUID | Surrogate primary key |
| `campaign_id` | UUID | NOT NULL, FK → `campaigns(id)` ON DELETE CASCADE |
| `asset_id` | UUID | NOT NULL, FK → `assets(id)` ON DELETE RESTRICT |
| `role` | ENUM (`inline`, `attachment`) | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

`UNIQUE (campaign_id, asset_id)`.

Roles:

- `inline` — a Neon Object Storage image referenced inside the campaign's Markdown
  body.
- `attachment` — a non-rendered asset, such as a PDF handout, dispatched as a MIME
  attachment.

Exclusions:

- Event banners are associated at the event level through
  `events.image_asset_id` and are never campaign assets.
- Per-recipient HMAC QR ticket images are generated at queue dispatch time and
  inlined as a MIME part. They create no `assets` row and no `campaign_assets` row.
  The Content-ID is derived from the signed ticket, so it is computed rather than
  stored and cannot drift between a preview and the sent message.

Ordering is derived, not stored. There is no `position` column:

- `inline` images take their order from where they appear in the Markdown source,
  resolved at compile time from the rendered document.
- `attachment` files are ordered alphabetically by `assets.original_filename`, with
  `created_at` as a tiebreak. A recipient reads an attachment list in name order,
  and this keeps the result deterministic without a stored column.

Consequences worth stating rather than discovering:

- The uniqueness constraint means one asset holds **one** role per campaign. An
  image cannot be both inline and an attachment on the same campaign. This is a
  deliberate tightening of the previous
  `UNIQUE (campaign_id, asset_id, role)`, which permitted both.
- The `header` role is removed. A Markdown body has no header concept, and the
  campaign already carries a subject while the event carries the banner.
- The surrogate `id` is retained and the uniqueness rule is a composite
  `UNIQUE` rather than a composite primary key. Both columns are already NOT
  NULL, so the constraint behaves identically while avoiding a primary-key type
  change on an existing table.
- The table has never had rows written, since no task owned binding an asset to a
  campaign, so the migration needs no data backfill.
