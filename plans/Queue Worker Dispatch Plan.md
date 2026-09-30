## Goal

Make batch campaign delivery actually run. Everything it needed existed; nothing
called it.

## Source Of Truth

- GitHub epic [#59: EPIC-07 Delivery Queue & Dual Provider Failover](https://github.com/UMak-SIC/sic-app/issues/59)
- `docs/traceability-matrix.md` (TSK-0705, TSK-0706, TSK-0707, US-19, US-20, US-23, DMA-08, DMA-09, DMA-10)
- `app/lib/queue/process-jobs.ts`, `claim-jobs.ts`, `delivery-logger.ts`
- `app/lib/queue/providers/*` (TSK-0703, TSK-0704)
- `app/lib/email/markdown-compiler.ts` (TSK-0601)
- `app/app/api/internal/queue-jobs/route.ts`
- `CONTEXT.md` (Queue, Delivery, Campaign)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider
traceability matrix are historical/derived context, not decision inputs.

## The Gap

`/api/internal/queue-jobs` only *enqueues*. It creates a `QueueJob` for a
delivery and returns. Nothing claimed those jobs.

A caller audit on `dev` found `processQueueJobs` had **zero callers**, and
`/api/internal/queue-jobs` imported only `requireQueueWorker` and
`getPrismaClient` — it never called the worker. So a campaign delivery would sit
in `queue_jobs` forever, and the retry, dead-letter, and attempt-logging logic
that TSK-0706 and TSK-0707 were built for would never execute.

The test-send action worked because it bypasses the queue entirely and calls a
provider directly. **Actual campaign delivery did not run.**

## What Was Added

### `app/lib/queue/delivery-message.ts` — the composition half

`ClaimedQueueJob` carries only a `deliveryId`, so the recipient, subject, body,
and interpolable event details are read here at dispatch time from the delivery's
own relations: `rosterEntry.attendee` for the address and name, `campaign` for the
subject and Markdown, `campaign.event` for the event.

`attendee.displayEmail` is used rather than `normalizedEmail`, because DMA-02
keeps the normalised form for matching and the display form for what a human sees
and what gets sent.

The body is compiled through `compileMarkdown` — the same path the composer
preview and the test send use — so what goes out is what was previewed.

A missing delivery, a missing roster entry, or an empty address **throws**. That
is deliberate: the adapters catch it and return a failed attempt, which gets
retried or dead-lettered. Returning a partial message would report a send that
never happened.

### `{{ token }}` substitution, and the tokens that do not exist

Campaign bodies interpolate `{{student_name}}`, `{{event_name}}`,
`{{event_time}}` and `{{venue}}`. **The first three have a source. `venue` does
not — `Event` has no venue column.**

An unknown token is **stripped rather than left in place**. Leaving it would put
a literal `{{venue}}` in front of an attendee, which is the kind of defect that
only surfaces after a real send. The names are returned so the composer can
validate against the supported set before saving.

This is the second schema/UI mismatch found in this codebase, after
`course`/`program` on `attendees`. Both are raised as issues rather than papered
over.

Matching is case-insensitive *and* the lookup is normalised. The first version
matched leniently but looked up the original casing, so `{{STUDENT_NAME}}` was
stripped despite matching the pattern. A test caught it.

### `app/lib/queue/provider-selector.ts` — the smallest honest selector

`processQueueJobs` requires a `selectProvider`, so something had to supply one.
This sends via Mailgun and falls back to Brevo when the delivery's most recent
attempt shows Mailgun returned `429`.

**This is not the failover engine.** US-21, US-22, DMA-10, and NFR-05 assign
quota accounting and configurable limits to TSK-0705, and `ProviderDailyUsage`
exists for it. A `429` is a heuristic: a deployment can exhaust its daily Mailgun
allowance without ever seeing one. TSK-0705 stays open and this should be
replaced by it rather than grown into it.

`DeliveryAttempt` has no `queueJobId`; the logger resolves `deliveryId` from the
job row, so the lookup goes through `deliveryId`.

### `app/app/api/internal/queue-worker/route.ts` — the drain endpoint

`POST`, guarded by the same `requireQueueWorker` shared secret the enqueue route
uses, because a scheduler calls it rather than a browser.

An absent body drains a default batch of 10, which is what a bare cron
invocation sends. A body that is present but unparseable is a 400 — `request.json()`
cannot distinguish "no body" from "broken body", so the text is read directly.
`limit` is validated against the same 1..100 range `claimQueueJobs` enforces.
`workerId` is accepted so `queue_jobs.locked_by` distinguishes one worker's locks
from another's, which is what makes a stuck job diagnosable.

## Tests

25 new cases.

`delivery-message.test.ts` covers substitution, whitespace and case tolerance,
unknown-token stripping and de-duplication, the exact supported token set, use of
`displayEmail`, and the three throw conditions.

`provider-selector.test.ts` covers the default, the 429 fallback, and that an
ordinary failure, a server error, and *Brevo's own* rate limiting all stay on
Mailgun — the last because returning Mailgun when the overflow is exhausted would
just burn the primary's remaining quota.

`queue-worker/route.test.ts` covers the secret check (asserting nothing is claimed
without it), the default drain, the dispatch being built from the resolver, limit
and workerId validation, and the absent-versus-unparseable body distinction.

## Matrix Changes

TSK-0706 and TSK-0707 flip to `[x] Completed`. Both were `[/] In Progress` solely
because they were waiting on a production dispatch implementation, which is what
this adds. TSK-0705 stays `[ ] Planned`, and the note under the table now says
plainly what is wired and what the quota work still owes.

## Non-Goals

- **Quota accounting and configurable limits.** TSK-0705.
- **The QR ticket in campaign email.** `qr-image-generator` still has no caller.
  Putting a real ticket in a batch send needs the roster entry at compose time,
  and the worker resolves the recipient but does not yet mint one. That is the
  remaining gap between this and a complete campaign send.
- **A scheduler.** Nothing invokes `/api/internal/queue-worker` on a timer. The
  existing cron routes cover closing events and retention, not delivery.
- Reconciling the 14 pre-existing stale TSK rows or the 47 reverse-matrix rows.
  Only TSK-0706 and TSK-0707 are flipped.

## Acceptance Criteria

- `POST /api/internal/queue-worker` requires the worker secret and claims nothing
  without it.
- With the secret, it claims a batch, resolves each delivery into an addressed
  and compiled message, dispatches it, and returns the counts.
- A delivery with no recipient, no roster entry, or no campaign body fails its
  attempt rather than reporting a send.
- `{{student_name}}`, `{{student_id}}`, `{{event_name}}` and `{{event_time}}` are
  substituted; an unsupported token is stripped rather than mailed.
- A missing delivery attempt still routes via Mailgun; a Mailgun `429` routes via
  Brevo.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass, and the route appears in the
  build's route table.
- TSK-0706 and TSK-0707 marked `[x] Completed`; TSK-0705 unchanged.
