## Goal

Connect the completed campaign dashboard to production data: an administrator can submit an event campaign atomically, observe its authoritative delivery progress as the queue worker updates it, inspect a failed recipient's last provider error, and safely return only failed deliveries to the queue without duplicating a sent email or losing attempt history.

## Source Of Truth

- GitHub epic [#61: EPIC-08 Campaign Management & Delivery Dashboard](https://github.com/UMak-SIC/sic-app/issues/61)
- GitHub child issue [#43: TSK-0801 atomic campaign submission](https://github.com/UMak-SIC/sic-app/issues/43)
- GitHub child issue [#44: TSK-0802 campaign delivery monitoring](https://github.com/UMak-SIC/sic-app/issues/44)
- GitHub child issue [#45: TSK-0803 failure detail and safe retry](https://github.com/UMak-SIC/sic-app/issues/45)
- `docs/traceability-matrix.md` (EPIC-08, US-18 through US-20, DMA-04, and DMA-08)
- `app/prisma/schema.prisma` (`Campaign`, `EventRosterEntry`, `EmailDelivery`, `QueueJob`, and `DeliveryAttempt`)
- `app/lib/queue/process-jobs.ts` and `app/lib/queue/delivery-logger.ts` (the established queue lifecycle and immutable attempt log)

## Non-Goals

- Changing delivery-provider selection, quota reservation, worker scheduling, or automatic retry behavior from EPIC-07.
- Adding campaign editing, scheduled sends, bulk recipient reordering, CSV export, analytics history, webhook tracking, or a separate campaign-status persistence model.
- Treating a provider's synchronous acceptance as inbox delivery; this dashboard reports the persisted queue and provider-attempt states already modeled by `email_deliveries`.
- Replacing the existing campaign visual design or exposing raw provider request/response payloads to administrators.

## Execution Order

## PR Stacking Strategy

```
dev
└── feat/tsk-0801-campaign-submission
    └── feat/tsk-0802-campaign-monitoring
        └── feat/tsk-0803-delivery-retry
```

Create #43 from `dev` and target `dev`. Create #44 from #43 because its list/detail read models and polling contract must consume the real campaign rows produced by submission; create #45 from #44 because the retry UI needs the same authenticated detail payload and delivery identifiers. Merge bottom-up with Graphite (`gt create`, then `gt submit --stack`) or open standard pull requests to their immediate parent branches and retarget each child after its parent merges.

## Linear Sub-Issue Tracking

No Linear project is configured. GitHub epic #61 already owns the implementation children: #43 campaign submission, #44 monitoring, and #45 failure inspection/retry.

### 1. Define the server-side campaign contracts and implement atomic submission (#43)

- Extend `app/lib/services/campaign-service.ts` with a narrowly scoped `submitCampaign` operation and a stable JSON-safe result type; add `app/app/api/campaigns/route.ts` for authenticated `POST`, and add service and route tests under `app/tests/lib/services/` and `app/tests/app/api/campaigns/`. Validate UUIDs, subject/Markdown limits, asset bindings, and recipient identifiers at the route boundary, and derive the creator from `requireAdmin()` rather than accepting an admin id from the browser.
- In one Prisma transaction, confirm the event is published and still sendable, validate active selected attendees and optional organizers, `createMany(..., skipDuplicates)` their `EventRosterEntry` rows, create the campaign and valid `CampaignAsset` bindings, then create one `EmailDelivery` and one `QueueJob` per resolved roster entry. Generate idempotency keys server-side, return the campaign id plus queued recipient count, and let any invalid event, removed attendee, missing asset, empty resolved audience, or failed insert roll the entire submission back.
- Update `app/app/(tabs)/campaign/new/page.tsx`, `app/components/campaign/campaign-preview-dialog.tsx`, and `app/components/campaign/campaign-send-confirmation-dialog.tsx` to load actual event people, call the test-send endpoint for practice messages, submit the final draft once with disabled/loading/error state, and navigate to `/campaign/{id}` only after the transaction succeeds. Delete the `INITIAL_DRAFT`, `EVENT_STUDENT_COUNTS`, and sample-recipient fallbacks from the send path; maintain the current three-step interface and use plain-language server error messages.
- Cover transaction inputs and rollback behavior, duplicate attendee selection, existing roster entries, closed/draft events, no active recipients, missing asset bindings, and the invariant that every committed delivery has exactly one queued job and only one delivery for its campaign/roster pair.

### 2. Deliver campaign list and live monitoring read models (#44)

- Add authenticated campaign list/detail queries in `app/lib/services/campaign-service.ts`, `app/app/api/campaigns/route.ts`, and `app/app/api/campaigns/[id]/route.ts`, with tests in the matching service and route suites. The list query should return compact campaign cards and aggregate counts; the detail query should return event metadata, delivery counts grouped directly by `DeliveryStatus`, recipients, queue state, bound assets, and the last attempt's provider/message/error fields without returning request or response payload JSON.
- Replace `app/components/campaign/campaign-data.ts` and its duplicate display-only types with one API response contract consumed by `app/app/(tabs)/campaign/page.tsx` and `app/app/(tabs)/campaign/[id]/page.tsx`. Render loading, empty, missing, and request-failure states instead of falling back to `cmp_1`; map `QUEUED` and `SENDING` to the existing sending display, `SENT` to delivered, and `BOUNCED`/`FAILED` to needs-help while retaining the existing Design.md tokens, Agrandir/Montserrat typography, Phosphor icons, and responsive layout.
- Poll the campaign detail endpoint at a modest fixed interval only while the page is visible and deliveries are queued or sending; refetch on window focus, cancel the interval on unmount, and update the entire snapshot atomically so the headline counts, recipient table, queue panel, and issue tab cannot disagree. Do not use fake progress curves, local timers, or client-side status mutations.
- Test list/detail authorization and 404 behavior, status aggregates across every delivery state, last-attempt selection, serialization of dates and bigint asset sizes, and polling cleanup/refresh behavior. Verify worker-driven transitions from `queued` to `sending`, `sent`, and `failed` appear in the returned detail model.

### 3. Add failure inspection and idempotent manual retry (#45)

- Add a focused failure-detail drawer at `app/components/campaign/failure-detail-drawer.tsx` and wire it into `app/components/campaign/campaign-delivery-diagnostics.tsx` and `app/app/(tabs)/campaign/[id]/page.tsx`. Show the recipient, current delivery state, provider, provider message reference, the latest operator-safe failure explanation, and attempt time; do not display provider payloads, secrets, internal job locks, or raw API responses.
- Add `retryFailedDeliveries` to `app/lib/services/campaign-service.ts` and authenticated `POST /api/campaigns/[id]/deliveries/retry` in `app/app/api/campaigns/[id]/deliveries/retry/route.ts`. Under a transaction, select only the requested deliveries belonging to the campaign whose current status is `FAILED`, reset their existing dead-letter `QueueJob` to `QUEUED` with `scheduledAt` now and cleared lock/error fields, reset the delivery to `QUEUED`, and preserve both all `DeliveryAttempt` rows and the queue job's `retryCount` so the next immutable attempt receives the next unused number; return queued, skipped-sent, and skipped-not-failed counts so a stale UI never claims an unsafe resend.
- Remove simulated resend/retry state and drag-reorder behavior from the recipient and diagnostics tables. Require a confirmation naming the exact failed-recipient count before bulk retry, disable retry actions for queued, sending, sent, and bounced rows unless a later product decision explicitly expands eligibility, then refetch the campaign snapshot after the API response.
- Test individual and bulk retries, mixed selected states, a sent delivery that changes state between page load and request, the same retry request repeated, campaign/delivery ownership mismatches, and preservation of prior attempt numbers. Verify no retry path creates a new `EmailDelivery`, no sent recipient becomes queued, and a subsequently claimed job records its next attempt number after the existing immutable history.

### 4. Verify the assembled delivery dashboard and update traceability

- Run `pnpm db:validate`, focused Vitest service/route/component suites, then `pnpm lint`, `pnpm test`, and `pnpm build` from `app/`; use the isolated test database configuration only, never dev/staging/production data. Add a browser-level campaign flow after #52's provider fakes land: submit a real event audience, observe queued state, process fake worker outcomes, inspect a failure, retry it, and confirm a sent recipient is not offered for resend.
- Perform the DESIGN.md pre-flight checklist on the changed campaign pages: desktop/mobile navigation, loading and empty states, keyboard focus and dialog escape behavior, explicit aria labels, reduced motion, destructive/retry confirmation, inline feedback, and token/typography/icon compliance. Update the EPIC-08 rows in `docs/traceability-matrix.md` only after the child issue verification criteria pass.

## Acceptance Criteria

- An authenticated administrator can submit a campaign for a valid published event, and one transaction creates the campaign, missing roster entries, one delivery per resolved recipient, and one queue job per delivery.
- Invalid submission input or any transaction failure leaves no partial campaign, roster, delivery, queue job, or asset binding behind.
- Campaign list and detail pages source all counts, recipients, provider references, and error summaries from persisted data; neither page falls back to campaign fixtures or fake success transitions.
- While delivery work is active, the detail view refreshes from the server and presents matching queued, sending, sent, bounced, and failed totals across every panel.
- A failure drawer exposes only useful recipient/provider error details and preserves protected internal provider payloads.
- Manual retry requeues only deliveries still in the permitted failed state, retains their delivery and attempt identity/history, and cannot resend a delivered recipient or create duplicate delivery rows.
- From `app/`, `pnpm db:validate`, `pnpm lint`, `pnpm test`, and `pnpm build` pass for the completed stack; the campaign browser flow passes once EPIC-10's test fakes are available.
