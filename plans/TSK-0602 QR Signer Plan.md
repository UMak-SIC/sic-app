## Goal

Sign and verify the opaque QR ticket for one event roster entry, so a scanned
ticket proves which roster entry it belongs to and cannot be forged, replayed
outside the check-in window, or moved between events. US-15 and DMA-07 define the
contract; TSK-0902 consumes the verifier.

## Source Of Truth

- GitHub child issue [#32: TSK-0602 HMAC-SHA256 QR ticket generator and validator](https://github.com/UMak-SIC/sic-app/issues/32)
- GitHub epic [#59: EPIC-06 Email Composer, Markdown Engine & QR Ticket Generation](https://github.com/UMak-SIC/sic-app/issues/59)
- `docs/traceability-matrix.md` (TSK-0602, US-15, DMA-05, DMA-07)
- `CONTEXT.md` (QR Ticket: "expires when its Event ends and cannot be reissued in the first release")
- `plans/TSK-0601 Markdown Compiler Plan.md` (the composer this ticket will be embedded in)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider traceability
matrix are historical/derived context, not decision inputs.

## Non-Goals

- Rendering the ticket as an image. TSK-0603, #33.
- The scan endpoint itself. TSK-0902, #47. This module only decides whether a
  ticket is valid and why not.
- Issuing tickets from a route or a campaign. TSK-0604 and TSK-0801 own that.
- Reissue. `CONTEXT.md` says v1 has no reissue path, so there is deliberately no
  function for it.

## Execution Order

Single self-contained slice. Uses only `node:crypto`, no new dependency.

## PR Stacking Strategy

```
dev
`-- feat/tsk-0602-qr-signer -> dev
    `-- feat/tsk-0603-qr-image-generator -> feat/tsk-0602-qr-signer
```

## Linear Sub-Issue Tracking

No Linear project is configured. Epic #59 owns children #31 through #35. This PR
completes #32; #33 depends on it.

### 1. Token shape

`base64url(payload).base64url(hmacSha256(encodedPayload, secret))`

The payload carries `eventId`, `rosterEntryId`, `windowOpensAt`, and
`windowClosesAt` as epoch milliseconds. `base64url` keeps the token URL-safe and
padding-free, so it survives being embedded in an email body and scanned from a
printed page.

Signing the **encoded** payload rather than the raw JSON means verification never
has to re-serialise, so there is no canonicalisation ambiguity about whether a
re-encoded payload is byte-identical.

### 2. Nothing about the attendee is in the ticket

The payload holds no email, name, or student ID, so a photographed or forwarded
ticket reveals nothing about who it belongs to. A test decodes the payload and
asserts none of those values appear, including the substrings `email` and
`student`.

**Known and accepted:** the roster entry UUID *is* recoverable from the token.
That is inherent to signing a payload rather than encrypting it, and the issue
requires HMAC-SHA256 specifically. It buys TSK-0902 a `wrong_event` result with no
database round trip, and roster entry UUIDs are not attendee identities. The
replay bound is the check-in window, not secrecy of the token. If a future
requirement needs the payload unreadable, that is a switch to AEAD encryption
and a change to the issue, not a tweak to this function.

### 3. Verify the signature before parsing anything

The order is deliberate: split, recompute the HMAC, compare with
`timingSafeEqual`, and only then base64-decode and `JSON.parse`. Unverified input
is never decoded or interpreted, so a hostile ticket cannot reach the parser at
all. A test asserts a correctly-signed-but-malformed body reports `malformed`
while a tampered body is stopped earlier at `invalid_signature`, which is what
proves the ordering.

`timingSafeEqual` throws on a length mismatch, so the lengths are compared first
and the comparison short-circuits.

### 4. One rejection reason per failure mode

`malformed`, `invalid_signature`, `not_yet_valid`, `expired`, `wrong_event`.

TSK-0902's verification criterion requires "distinct error reasons
(malformed, expired, wrong_event)", and a scanning administrator needs to
distinguish "come back later" from "this is not our event" from "this was
forged". Each carries a message, because the reason reaches a person holding a
phone at a door.

`not_yet_valid` is an addition beyond the three the issue names. A scan two hours
before an event is a normal operational case, and folding it into `expired` would
tell an administrator to give up on a ticket that will work shortly.

### 5. Window from DMA-05

`getCheckInWindow` is two hours before `starts_at` through two hours after
`ends_at`, as a single exported constant so TSK-0902 and TSK-0903 cannot drift
from it. Both boundaries are inclusive, and tests pin the exact instants.

### 6. Secret handling

`QR_TICKET_SECRET` is required, must be at least 32 characters, and throws
otherwise, matching `getOrganizationTimezone()` and the upload path rather than
falling back to a default. `secret` can be overridden so tests do not depend on
deployment configuration.

A missing secret throws rather than returning a rejection, so a misconfigured
deployment is not mistaken for a forged ticket and silently shows scanning staff
an "invalid" error for every guest.

Documented in `app/.env.example` and `app/.env.test.example`, and added to the
credential-isolation guard in `.github/workflows/ci.yml`, so it can never reach
browser code. The example file warns against rotating it while tickets are live,
because v1 has no reissue path.

## Testing Note

Two tests in the first draft were named for what they claimed to cover but
actually asserted `invalid_signature`, because the forged body did not match the
signature. That left the JSON-parse guard and the payload-shape guard untested.
The suite now signs arbitrary bodies with the real secret via `node:crypto`, so
verification genuinely reaches those guards and they are exercised.

## Acceptance Criteria

- A ticket is two base64url segments with no `+`, `/`, or `=` characters, and the
  signature is a 43-character unpadded SHA-256 digest.
- Signing is deterministic for identical inputs and differs when the event,
  roster entry, or secret differs.
- The decoded payload contains no email, name, or student ID.
- A valid ticket verifies inside the window, including at both exact boundaries.
- `malformed` covers a wrong shape, a bad segment count, and a signed body that
  is not JSON or not a valid ticket shape.
- `invalid_signature` covers a tampered payload, a tampered signature, and a
  ticket signed with a different secret.
- `expired` fires after the window closes and `not_yet_valid` before it opens.
- `wrong_event` fires when `expectedEventId` is supplied and does not match.
- A missing or too-short secret throws rather than reporting a bad ticket.
- Surrounding whitespace from a scanned value is trimmed.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass, and the CI credential-isolation
  guard includes `QR_TICKET_SECRET`.

## Open Question For Review

Rotation. `CONTEXT.md` says a ticket "cannot be reissued in the first release", and
the secret is the only thing tying a ticket to this deployment. Rotating
`QR_TICKET_SECRET` therefore invalidates every ticket already sent, with no way to
replace them, which for a real event means every attendee must be re-sent a
ticket.

That is acceptable for v1 only if rotation is understood to be a breaking event.
Two things are worth deciding before this reaches production:

1. Whether to keep the secret stable for the life of the deployment, and document
   rotation as a scheduled, announced operation.
2. Whether TSK-0902 should record a rejection reason in the delivery or attendance
   log, so an operator can tell "forged or tampered" apart from "expired" after
   the fact.

Neither changes this module, so neither is actioned here.
