## Goal

Replace the `429` heuristic provider selector with real transactional daily quota
reservation and Mailgun-to-Brevo failover (TSK-0705, #40).

## Source Of Truth

- GitHub issue [#40: TSK-0705 Implement quota reservation and Mailgun-to-Brevo failover](https://github.com/UMak-SIC/sic-app/issues/40)
- GitHub epic [#59: EPIC-07 Delivery Queue & Dual Provider Failover](https://github.com/UMak-SIC/sic-app/issues/59)
- `docs/traceability-matrix.md` (TSK-0705, US-21, US-22, US-23, DMA-10, NFR-05)
- `app/lib/queue/provider-selector.ts`, `process-jobs.ts`, `claim-jobs.ts`
- `app/prisma/schema.prisma` (`ProviderDailyUsage`, `QueueJobStatus`)
- `plans/Queue Worker Dispatch Plan.md` (the dispatch this builds on)

## Why the previous selector was not enough

`selectProviderForJob` read the last `DeliveryAttempt` and fell back to Brevo on
a `429`. Three problems:

1. A deployment can exhaust its daily Mailgun allowance without ever seeing a
   `429`, so the 101st send went out anyway.
2. `ProviderDailyUsage` existed in the schema and **nothing read or wrote it**.
3. Limits were not configurable, so NFR-05 was unmet.

## What was added

### `app/lib/queue/quota-manager.ts` — reservation

`reserveProviderSlot` walks the providers in preference order and takes a slot on
the first with capacity, returning `null` when they are all exhausted.

The reservation is a **compare-and-swap**: the update only applies while
`reservedCount` is still below the limit, and Postgres re-evaluates that
predicate under the row lock. A read-then-write would let two workers both pass
the 100th slot. The day's row is created with an `upsert` first so the guarded
update has something to match.

**What the two counters mean.** `reservedCount` is slots taken for the day. It is
incremented on reservation and only decremented when a reservation is *released*,
which happens when a send failed and consumed no provider capacity. `sentCount`
is the subset that actually went out and is informational. The capacity guard
reads `reservedCount`, which is why confirming a send does **not** give the slot
back — doing so would hand out the same allowance repeatedly — while releasing a
failed send does, so a day of provider errors cannot burn the quota.

`releaseProviderReservation` is floored at zero so a double release cannot drive
the counter negative and grant more than the provider's allowance.

### The quota day is the organization's calendar day

`usage_date` is a `Date` column, so it needs a date rather than an instant.
Resetting at UTC midnight would give a Manila campus a quota starting at 8am
local time, so `getUsageDate` resolves the current day through
`ORGANIZATION_TIMEZONE`.

### Configurable limits, defensively parsed

`MAILGUN_DAILY_LIMIT` (default 100, US-21) and `BREVO_DAILY_LIMIT` (default 300,
US-22). A malformed value falls back to the default rather than throwing, because
a typo in a quota variable should not take delivery down for the day.

A test caught a real gap here: `Number("1000000000000000000000")` is `1e21`, which
`Number.isInteger` accepts. A digit slip would therefore have silently *disabled*
the cap that US-21 and US-22 exist to provide. There is now a documented
`MAX_DAILY_LIMIT` of 1,000,000 — far above any real provider allowance, present
only to catch slips. A limit of `0` takes a provider out of rotation without a
code change.

### US-23 — holding work when both quotas are exhausted

This required a signature change. `selectProvider` now admits `null`, which means
no provider had capacity. `processQueueJobs` treats that as neither success nor
failure:

- **No attempt is recorded.** Recording one would increment `retry_count` and
  slowly dead-letter a backlog that was only ever waiting for tomorrow's quota.
- **The claim is released** via the new `releaseClaimedJob`, so the job returns to
  `queued` immediately instead of sitting in `processing` until its lock expires
  and holding up every job behind it.
- **`retryCount` is deliberately untouched.** Nothing was tried, so nothing failed.
- The count is reported as `held` in the response.

`releaseClaimedJob` is scoped to `lockedBy`, so a worker whose lock was already
stolen cannot release another worker's claim. There was no existing release
function, which is why this was added to `claim-jobs.ts`.

The route also checks `hasProviderCapacity()` before claiming, so an exhausted
day costs one indexed read rather than a batch of locks. The per-job reservation
remains the authority, because capacity can be consumed between that read and the
claim.

### `provider-selector.ts` — now a reservation

It reads the last attempt to decide **ordering** — a rate-limited primary is
pushed behind the other, without which every remaining job in the batch would
repeat the same `429` — and then delegates to `reserveProviderSlot`. Brevo's own
`429` does not reorder, since the primary is the default preference anyway.

### The route settles the reservation

`withQuotaReconciliation` wraps the adapter dispatch: success keeps the slot and
increments `sentCount`; any non-success releases it; a throw releases it and
re-throws so the queue still records the attempt as a failure.

## Tests

23 new cases in `quota-manager.test.ts` (limit parsing including the `1e21` slip,
the timezone boundary at Manila midnight, the CAS guard, the Brevo fallback, the
exhausted case, zero-limit exclusion of a provider, counter settlement, and the
pre-flight check), plus new cases in `provider-selector.test.ts` for the
reordering and pass-through, `process-jobs.test.ts` for the held path including
that the batch continues afterwards, `claim-jobs.test.ts` for the release, and
`route.test.ts` for the exhaustion pre-flight and the three settlement outcomes.

310 tests pass, up from 277.

## Matrix Changes

TSK-0705, US-21, US-22 and US-23 flip to `[x] Completed`. US-23's task mapping
gains TSK-0705, since the hold is implemented by the selector and `process-jobs`
rather than by the dead-letter work alone. The note under the table is rewritten
to describe the wired behaviour.

## Non-Goals

- **A scheduler.** Nothing invokes `/api/internal/queue-worker` on a timer.
- **The QR ticket in campaign email.** `qr-image-generator` still has no caller.
- **Per-provider billing fidelity.** Whether a `4xx` rejection from Mailgun
  consumes the provider's daily allowance is provider-specific and is not
  modelled; a failed send returns its slot.
- Reconciling the pre-existing stale rows elsewhere in the matrix.

## Acceptance Criteria

- `MAILGUN_DAILY_LIMIT` and `BREVO_DAILY_LIMIT` configure the caps, defaulting to
  100 and 300.
- Mailgun is used until its cap, then Brevo, then work is held.
- The reservation is transactional: concurrent workers cannot exceed the cap.
- A failed send returns its slot; a successful one keeps it.
- A job that cannot be reserved is returned to `queued` with no attempt recorded
  and no `retry_count` change.
- The quota day follows `ORGANIZATION_TIMEZONE`.
- `pnpm test`, `pnpm lint` and `pnpm build` pass.
