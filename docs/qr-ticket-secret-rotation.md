# Rotating `QR_TICKET_SECRET`

Operational runbook for the secret that signs event QR check-in tickets.

## What this secret does

Every check-in ticket a recipient receives is signed with `QR_TICKET_SECRET` using
HMAC-SHA256. The signature is what makes a ticket unforgeable: the ticket itself
is an opaque string that reveals no name, email, or student ID, and the only way
to tell a genuine ticket from a made-up one is to recompute the signature with
this secret and compare.

That means **the secret is the trust boundary.** Anyone who does not have it
cannot produce a ticket that scans.

## Why rotation is disruptive

`verifyQrTicket` recomputes the signature with the currently configured secret. A
ticket signed under an old secret does not verify under a new one — the HMAC
simply produces a different value.

In this release there is no reissue path. A ticket that no longer verifies cannot
be replaced, and a roster entry cannot be given a second working ticket. So for a
real event, rotating means every attendee who has not yet scanned has to be sent a
new ticket.

## The rule

> **Rotate only when no event's check-in window is still open.**

A ticket stays scannable from two hours before its event starts until two hours
after it ends. That is `CHECK_IN_WINDOW_MS` in `app/lib/security/qr-signer.ts`,
and it is what DMA-05 specifies.

In database terms, rotation is safe when this returns **zero**:

```sql
SELECT count(*) AS events_still_scannable
FROM events
WHERE ends_at + interval '2 hours' > now();
```

Any non-zero result means at least one event could still accept a scan, and
rotating now would break check-in for that event.

Run it against the same database the app is using. In local development that is
your `DATABASE_URL`; in preview and production it is the branch that deployment
points at.

## Before you rotate

1. **Check the window.** Run the query above. If it is not zero, stop and wait
   until the last event's window has closed. Note how long: subtract `now()` from
   the largest `ends_at + interval '2 hours'`.

2. **Check for far-future drafts.** The query above counts *every* event,
   including drafts that have not been published. A draft scheduled for next year
   will block rotation indefinitely even though no ticket was ever sent for it.
   If that is the situation, either reschedule or close the draft, or run the
   narrower query below and accept that you are relying on unpublished events
   never having produced tickets:

   ```sql
   SELECT count(*)::int AS published_events_still_scannable
   FROM events
   WHERE status = 'published'
     AND ends_at + interval '2 hours' > now();
   ```

   The status values are stored lowercase — the Prisma enum is
   `PUBLISHED @map("published")` — so `status = 'PUBLISHED'` is an invalid enum
   input and the query errors rather than returning zero.

3. **Tell people.** Check-in staff should know a rotation happened, because if
   anything goes wrong the symptom is every ticket being rejected and it looks
   like a scanner fault rather than a key change.

4. **Keep the current value reachable.** Write the existing value down or copy it
   somewhere you will find it. The recovery path below depends on it, and Vercel's
   environment history is the only place it exists.

## How to rotate

1. Generate a new value:

   ```bash
   openssl rand -base64 32
   ```

2. Set `QR_TICKET_SECRET` to the new value in the environment settings for the
   deployment. The secret is per-environment and per-deployment: preview,
   staging, and production each hold their own value and do not affect one
   another. Rotating preview while production keeps its key is safe, because
   tickets signed in one are never scanned in the other.

3. Redeploy. The new value only takes effect for requests served after the
   redeploy finishes, so the old and new values briefly coexist. That is
   harmless: a ticket verifies under whichever secret was active when it was
   scanned, and any ticket signed before the redeploy that is scanned after it
   will be rejected. This is the practical reason the window check in step 1
   matters.

4. Confirm the deployment came up. Tickets signed after the redeploy verify; a
   ticket signed before it does not.

## If you rotate by accident

The symptom is unmistakable: **every** ticket is rejected as
`invalid_signature`, for every attendee, at once. Scanning staff will report that
the scanner has stopped working.

Recover by restoring the previous value:

1. Retrieve the previous `QR_TICKET_SECRET` from the deployment's environment
   history. Vercel keeps superseded values per deployment, so the value used by
   the previous deployment is recoverable.
2. Set it back.
3. Redeploy.

Every ticket signed under the old value verifies again, because that is the
value they were signed with. Nothing is lost — that is why the recovery step
depends on the old value still being available, and why step 4 of the pre-flight
checklist insists on keeping it.

If the previous value is genuinely lost, the affected events' attendees must be
sent new tickets. There is no other path in this release.

## Key hygiene

- **Minimum 32 characters.** `app/lib/security/qr-signer.ts` throws below that
  length rather than silently using a weak key.
- **Generate it, do not type it.** `openssl rand -base64 32`. A passphrase is
  acceptable only if it is long and random.
- **Never commit it.** `app/.env.example` and `app/.env.test.example` carry
  placeholders only. `app/.env.local` is gitignored.
- **Never expose it to the browser.** It must not appear in a `NEXT_PUBLIC_*`
  variable, or in any code that ships to the client.

  Note that CI's `Reject browser-exposed service credentials` step does **not**
  currently enforce this. The workflow sets `working-directory: app`, and the
  step searches the path `app`, which from there resolves to `app/app/` — the
  App Router directory, 25 files. `lib/`, `components/`, and `tests/` are outside
  what it scans, so a secret read in a client component under `components/` would
  ship undetected. Treat this rule as one you follow by review, not one CI is
  catching for you.
- **Never copy a production value into another environment.** Environments must
  not share a signing key, or a staging deployment could mint tickets that verify
  in production.
- **Different value per environment.** Each deployment gets its own generated
  value.

## Related

- `app/lib/security/qr-signer.ts` — the signer and verifier
- `plans/TSK-0602 QR Signer Plan.md` — why the secret is required and never
  defaulted
- `docs/traceability-matrix.md` — TSK-0606, DMA-05, DMA-07
