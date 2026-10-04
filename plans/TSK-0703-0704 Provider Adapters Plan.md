## Goal

Implement the two provider transports so EPIC-07's queue has something to send
through, and unblock TSK-0605.

## Source Of Truth

- GitHub child issue [#38: TSK-0703 Mailgun HTTP API delivery adapter](https://github.com/UMak-SIC/sic-app/issues/38)
- GitHub child issue [#39: TSK-0704 Brevo HTTP API overflow delivery adapter](https://github.com/UMak-SIC/sic-app/issues/39)
- `docs/traceability-matrix.md` (TSK-0703, TSK-0704, US-21, US-22, NFR-02)
- `app/lib/queue/process-jobs.ts`, `claim-jobs.ts`, `delivery-logger.ts`
- `app/node_modules/next/dist/docs/` (not applicable; no Next APIs used here)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider
traceability matrix are historical/derived context, not decision inputs.

## Why These Were Blocked

TSK-0605 (test send) needs a provider client to dispatch through, and the
`EmailProvider` enum and `ProviderDailyUsage` model have existed since the init
migration with no adapter behind them. The matrix already noted that TSK-0706 and
TSK-0707 "have a tested worker core, but remain in progress until TSK-0703
through TSK-0705 provide a production dispatch implementation."

## The Contract Was Already There

`processQueueJobs` takes `selectProvider` and `dispatch` by injection, so the
architecture was designed for this and nothing needed restructuring:

```ts
dispatch: (job: ClaimedQueueJob, provider: EmailProvider) =>
  Promise<Omit<DeliveryAttemptResult, "provider">>;
```

The adapters fill that shape and normalise every outcome, so all outbound
attempts reach `recordDeliveryAttempt` the same way regardless of provider.

`createProviderDispatch(deps)` binds the dependencies and returns exactly the
two-argument function `processQueueJobs` wants. The adapter map is keyed by the
Prisma enum, so adding a provider to the schema without writing an adapter is a
compile error rather than a silent no-op at runtime.

## These Are Transport Only

`ClaimedQueueJob` carries `{ id, deliveryId, retryCount, maxRetries,
scheduledAt, lockExpiresAt }` — no recipient, subject, or body. The adapters
therefore take a `ResolveMessage` dependency and never load the delivery
themselves.

Composing the message is a separate concern: substituting recipient attributes,
compiling the Markdown body through `markdown-compiler` (TSK-0601), and minting
the QR ticket through `qr-signer` and `qr-image-generator` (TSK-0602, TSK-0603).
That belongs to the campaign and delivery work. Injecting the resolver keeps these
two tasks to what their verification criteria actually specify — "dispatches
through the HTTP API and handles 200 and error responses without SMTP" — and
keeps them testable without a database.

## Adapters Never Throw For A Delivery Failure

`processQueueJobs` catches a throw and records
`errorMessage: error.message` with no status and no provider response. That loses
exactly the information an operator needs to tell a bad API key from a rejected
recipient. So a non-2xx becomes a normalised failed attempt carrying
`httpStatus`, the provider's own `responsePayload`, and a message that names the
cause.

The status classes are distinguished deliberately, because the failover engine
needs them: 401/403 is a bad key, 429 is rate limiting, 5xx is the provider's
fault, other 4xx is a rejected payload. 429 in particular is what should send
traffic to the overflow provider.

Message composition failures — a missing key, an empty recipient, a blank subject
— are also returned rather than thrown, so one malformed job cannot abort a batch
mid-loop.

## Transport Details

**Mailgun** posts form-encoded to
`https://api.mailgun.net/v3/{domain}/messages` with Basic auth as `api:<key>`.
Two details that would otherwise fail at runtime: the domain is
percent-encoded so a value containing `/` cannot alter the path, and tags are
truncated to three characters because Mailgun rejects longer ones.

**Brevo** posts JSON to `https://api.brevo.com/v3/smtp/email` with a bare
`api-key` header, not Basic auth. It answers **201**, not 200, and returns
`messageId` rather than `id`. Optional fields are omitted rather than sent as
empty strings.

Neither opens an SMTP socket. NFR-02 requires HTTP only, and the queue worker is
a Next.js process rather than a mail relay, so an SMTP path would mean running a
relay inside the app.

## Quota Is Not Implemented Here

Both task titles mention a daily quota — 100/day for Mailgun, 300/day for
Brevo — but US-21 and US-22 assign the quota decision to **TSK-0705** alongside
the failover engine, and `ProviderDailyUsage` exists for it. Enforcing it in the
adapter would put a policy decision in the transport and duplicate the counter.

What these adapters owe TSK-0705 is a distinguishable 429, which they return. The
matrix rows now say so explicitly rather than leaving the impression that the
quota is handled.

## Configuration

`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`, `BREVO_API_KEY`,
`BREVO_FROM_EMAIL`, `BREVO_FROM_NAME` are added to `app/.env.example`. None
existed before, though the `EmailProvider` enum and the CI credential guard both
already anticipated them.

`MAILGUN_FROM` is a full RFC 5322 string because the Mailgun API takes it as
one; Brevo's sender is structured, so it is two variables.

`app/.env.test.example` lists the provider keys commented out, with a note that
the absence is deliberate: the adapters take their transport and environment by
injection, so the suites stub `fetch` and pass an env object rather than reading
the process environment.

## Tests

29 cases across the two adapters, all with `fetch` stubbed, so no network call is
made and no real key is needed.

Beyond the happy paths, each adapter covers: the authentication scheme and
content type actually sent, the status code that differs from the other provider
(201 for Brevo), 401/429/5xx distinguished from each other, a non-JSON error body
that must not throw, a network rejection recorded rather than thrown, missing
configuration failing before any request is made, and a message with no recipient
or no body being refused.

## Non-Goals

- **Message composition.** Injected, as described above.
- **Quota and failover.** TSK-0705.
- **Wiring `createProviderDispatch` into the worker.** `processQueueJobs` is
  called from `/api/internal/queue-jobs`; connecting the factory there is the
  worker's own task, and doing it here would mean choosing a message resolver
  that does not exist yet.
- Reconciling the 14 pre-existing stale TSK rows or the 47 reverse-matrix rows.
  Only the TSK-0703 and TSK-0704 rows are flipped.

## Acceptance Criteria

- Mailgun dispatches over its HTTP API, returns the provider message id, and
  never opens an SMTP connection.
- Brevo dispatches over its transactional HTTP API, returns the provider message
  id, and never opens an SMTP connection.
- 200/201 and 401, 429, 5xx, and other 4xx are each handled and reported
  distinctly, with the provider's status and response body preserved.
- A dispatch failure never throws out of the adapter, so one bad job cannot abort
  a batch.
- Missing configuration fails with a message naming the variable, before any
  request is attempted.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass, with no network access in tests.
- TSK-0703 and TSK-0704 marked `[x] Completed` in `docs/traceability-matrix.md`.
