## Goal

Let an operator send one message to one address and see what the provider
actually said, without touching the roster or the queue (TSK-0605, US-17).

## Source Of Truth

- GitHub child issue [#35: TSK-0605 single-address test send action](https://github.com/UMak-SIC/sic-app/issues/35)
- GitHub epic [#59: EPIC-07 Delivery Queue & Dual Provider Failover](https://github.com/UMak-SIC/sic-app/issues/59)
- GitHub child issue [#38: TSK-0703 Mailgun adapter](https://github.com/UMak-SIC/sic-app/issues/38)
- `docs/traceability-matrix.md` (TSK-0605, US-17, US-21)
- `app/lib/queue/providers/*` (added by TSK-0703/0704)
- `app/lib/email/markdown-compiler.ts` (TSK-0601)
- `app/lib/validation/attendee-validation.ts` (TSK-0501)
- `app/node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider
traceability matrix are historical/derived context, not decision inputs.

## What Was Blocking It

TSK-0605 was the last task held up by EPIC-07. There was no provider client to
dispatch through, so this waits on TSK-0703/0704 and is stacked on that branch.
With the adapters in place, nothing else was missing: `requireAdmin`,
`compileMarkdown`, and `validateEmail` all existed.

## It Does Not Enqueue

US-17 is explicit: a test send must not enqueue batch roster jobs. The route
dispatches synchronously and never touches the database — it does not import
`getPrismaClient` at all.

The reason is capacity, not tidiness. A test send that went through
`processQueueJobs` would claim a queue slot, compete with real campaign traffic
for the daily provider quota, and leave an `email_deliveries` row that looks
like a roster delivery to anyone reading the logs. A test asserted that
`processQueueJobs` is not called, because "the route does not obviously call it"
is weaker than "the queue is not reachable from here".

## It Does Not Fail Over

Provider selection is fixed to Mailgun, the primary in US-21.

A test send is exactly the wrong place to start failing over. An operator testing
a draft wants the primary's real answer, including its failures — if the primary
key is wrong, silently succeeding via the overflow provider would hide the very
thing the test was checking. The dual-provider decision belongs to the engine in
TSK-0705, which this does not anticipate.

## It Composes Through The Real Chain

The body goes through `compileMarkdown` rather than being accepted as HTML, so a
test send previews exactly what a campaign would send — the same sanitizer, the
same allowlist, the same storage-host image pinning.

This is also TSK-0601's only production caller. `markdown-compiler.ts` was
implemented, tested, and merged with no non-test caller, so the Markdown engine
was reachable only from its own suite.

There is no QR ticket in a test send, deliberately. A ticket is bound to a
roster entry, and a test address has none. Minting one would mean inventing a
roster entry, which is precisely the roster traffic US-17 says not to create.

The address is validated with `validateEmail` from TSK-0501, so a test send
rejects the same addresses the registry would rather than accepting one and
letting the provider bounce it minutes later.

## Failure Handling

Three distinct outcomes, because they mean different things to an operator:

- **400** — the request was wrong. A malformed address, a missing recipient, a
  field of the wrong type. Nothing was sent.
- **502** — the request was fine and the provider was not. The provider's own
  reason is passed through, which the adapters already phrase in operator terms
  ("Mailgun rejected the API key") rather than surfacing a raw response body.
- **503** — the service is not fully configured. `compileMarkdown` needs the
  storage endpoint to pin image hosts to and throws without it; that is a
  deployment fault rather than anything the operator typed, so it gets its own
  message instead of a 500.

Fields are length-bounded before use, and a field of the wrong type is rejected
rather than coerced — a `subject` of `42` is a client bug worth surfacing, not
something to stringify.

An empty body is sent rather than refused, because testing a blank draft is a
legitimate thing to do while writing a campaign.

## Tests

13 cases. The transport is stubbed, since the adapters have their own suites, but
the deps the route built are captured so the composed message is asserted
directly rather than assumed.

Beyond the paths above, the suite covers: the message going to the display form
of the address rather than the normalised one, a default subject when none is
given, and the sanitizer actually stripping a `<script>` tag from the HTML the
route composed.

## Non-Goals

- **No UI.** The composer would call this from a "send a test" action; that is
  TSK-0604's surface.
- **No QR ticket**, as described above.
- **No failover or quota.** TSK-0705.
- **No campaign selection.** This sends the body it is given. Loading a stored
  campaign's subject and body is the composer's job.
- Reconciling the 14 pre-existing stale TSK rows or the 47 reverse-matrix rows.
  Only the TSK-0605 row is flipped.

## Acceptance Criteria

- `POST /api/campaigns/test-send` requires an admin session.
- It sends one message to one address and reports the provider's message id.
- It creates no queue job and does not call `processQueueJobs`.
- The body is compiled through `compileMarkdown`, so a test send matches what a
  campaign would render.
- A malformed address is rejected before anything is sent.
- A provider failure returns 502 with the provider's reason; a missing storage
  endpoint returns 503.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass, and the route appears in the
  build's route table.
- TSK-0605 marked `[x] Completed` in `docs/traceability-matrix.md`.

## PR Stacking

Stacked on `feat/tsk-0703-0704-provider-adapters`, which does not depend on
anything else. Merge that first, then rebase this onto `dev`.
