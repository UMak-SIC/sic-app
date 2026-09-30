## Goal

Make it possible to actually sign in. The sign-in form shipped as a visual stub,
so the application had no working way to establish a session.

## Source Of Truth

- GitHub child issue [#16: TSK-0201 Neon Managed Better Auth sign-in](https://github.com/UMak-SIC/sic-app/issues/16)
- GitHub epic [#55: EPIC-02 Authentication & Administrator Authorization](https://github.com/UMak-SIC/sic-app/issues/55)
- `docs/traceability-matrix.md` (TSK-0201, TSK-0204, US-01, DMA-01)
- `.agents/skills/neon-auth/references/managed-auth.md`
- `app/node_modules/@neondatabase/auth/dist/**` (client and handler contracts)
- `better-auth@1.6.23/dist/api/middlewares/origin-check.mjs`
- `CONTEXT.md` (Admin definition)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider
traceability matrix are historical/derived context, not decision inputs.

## What Was Broken

`app/app/(auth)/login/page.tsx` and `register/page.tsx` both reduced to:

```tsx
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};
```

No `fetch`, no `signIn`, no auth client, no `/api/auth` reference anywhere in
either file. The inputs were controlled and the button was wired, so the form
looked finished and did nothing.

This was survivable only because TSK-0203's matcher gap left six admin pages
public. Once those were closed, the whole application sat behind a login wall
with no working door.

## The Correction To TSK-0201

`fix/tsk-0201-sign-in-redirect` flipped TSK-0201 to `[x] Completed` on the
strength of the redirect fix. That was wrong. The row's criterion is "a valid
email/password session is established", and no session could be established
through the UI. **This branch sets the row back to `[/] In Progress`.**

It stays In Progress after this branch, because of the blocker below.

## Implementation

Follows the documented pattern exactly, verified against
`.agents/skills/neon-auth/references/managed-auth.md`:

```tsx
import { createAuthClient, isAuthApiError } from "@neondatabase/auth/next";

const authClient = createAuthClient();   // takes no arguments, by design
const { error } = await authClient.signIn.email({ email, password });
```

The reference is explicit that the browser client takes no arguments and talks to
the same-origin catch-all, and that passing options is unsupported while Auth is
managed by Neon.

**A hand-rolled fetch was tried first and is wrong.** Posting JSON straight to
`/api/auth/sign-in/email` gets `403 {"code":"INVALID_ORIGIN"}`, because
`validateOrigin` in better-auth compares the request `Origin` against
`trustedOrigins`, and this app's origin is not on that list. The SDK client is
the supported path and handles the request correctly.

`isAuthApiError` separates a rejected credential from a transport failure so the
message can be accurate. The response body is never surfaced: the charter bans
API error strings, and the API distinguishes "no such user" from "wrong
password", which would tell an attacker which addresses are registered. One
message covers both.

Also corrected while in the file: the email field had `id="username"`,
`type="text"`, and `placeholder="Username"` under a label reading "Email". It is
now `id="email"`, `type="email"`, `autocomplete="email"`, and the label, id, and
placeholder agree. The error notice uses the `text-red` token rather than a
Tailwind palette class, and the field is wired to the notice with
`aria-describedby` and `aria-invalid`.

## Open Blocker 1: Neon Auth Does Not Trust This Origin

Verified, not inferred. A probe against the running server, from a real browser
context through the SDK client, with the correct JSON body:

```
REQ http://127.0.0.1:3100/api/auth/sign-in/email
  content-type=application/json
  body={"email":"nobody@example.com","password":"..."}
RES 403 http://127.0.0.1:3100/api/auth/sign-in/email
  body={"message":"Invalid origin","code":"INVALID_ORIGIN"}
```

`NeonAuthConfig` is only `baseUrl`, `cookies`, and logging input. There is no
`trustedOrigins` option, so the application cannot declare its own origin
through this SDK. The allowlist lives on the Neon Auth instance, and the
configured instance is `ep-lucky-forest-azzy2kd7.neonauth...`.

The same request through the app with a trusted `Origin` returns **200** with a
valid session, which isolates this to the allowlist and rules out the app's
handler, the catch-all, and the client:

```
POST /api/auth/sign-in/email   Origin: <NEON_AUTH_BASE_URL>   ->  200
POST /api/auth/sign-in/email   Origin: http://localhost:3000  ->  403 INVALID_ORIGIN
```

**Action needed in the Neon console:** add the application's origin to the Neon
Auth instance's trusted origins.

## Open Blocker 2: Session Cookies Are `__Secure-`, So Local Dev Needs HTTPS

`NEON_AUTH_COOKIE_PREFIX` is the hardcoded constant `"__Secure-neon-auth"` in
`@neondatabase/auth`. It is not configurable and not derived from the scheme, so
the session cookies are always issued with the `Secure` attribute. Confirmed from
a real sign-in response:

```
__Secure-neon-auth.session_token    secure=TRUE
__Secure-neon-auth.local.session_data  secure=TRUE
```

A browser will not store or send a `Secure` cookie over plain HTTP. That means
**`http://localhost:3000` cannot hold a session at all**, independently of
blocker 1, so fixing the allowlist alone will not make local login work.

This was confirmed rather than assumed. Sending the same cookies to the running
app as an explicit `Cookie` header, which bypasses the browser's Secure rule,
returns **200 on `/overview`** with no redirect to sign-in. The session, the
`admins` row, and the layout guard are all working; only transport security is in
the way.

Local development therefore needs HTTPS. This Next version supports it directly:

```
next dev --experimental-https        # self-signed certificate
```

The origin then becomes `https://localhost:3000`, which also has to be on the
trusted list. The alternative is to exercise sign-in on the deployed HTTPS
environment, where the origin trust has to be configured anyway.

## Blocker 3 (resolved): The `admins` Table Was Empty

The development database was empty:

```
ADMINS_ROWS=0
events=0 attendees=0 assets=0 campaigns=0
```

The layout guard added in TSK-0203 authorizes against `admins`, not just the
session, so a valid session with no matching row is refused with 403 and lands
on the access-denied page. That guard is working as intended.

`app/scripts/bootstrap-admin.mjs` seeds the row and is idempotent. It needs
`ADMIN_NEON_AUTH_USER_ID`, which is documented in `app/.env.example` but was
absent from `.env.local`, so it had never been run.

**To get in, in order:**

1. Create a user in Neon Auth.
2. Put its id in `.env.local` as `ADMIN_NEON_AUTH_USER_ID`.
3. `node --env-file=.env.local scripts/bootstrap-admin.mjs`
4. Add the app's origin to the Neon Auth trusted origins, for `https://localhost:3000`
   and for whatever domain it is deployed on.
5. Run the app over HTTPS locally with `next dev --experimental-https`, or use the
   deployed environment.
6. Sign in at `/login`.

## Tests

`app/tests/e2e/sign-in.spec.ts`, two cases:

- A failed sign-in surfaces a plain-language message, keeps the visitor on
  `/login` with the form re-enabled, and logs no unexpected console errors.
- An aborted request is reported rather than hanging, and the button is left
  usable, which is the failure mode a missing `catch` produces.

Both assertions are deliberately about the contract rather than the specific
failure. Whether a wrong password returns a rejected credential or a transport
error depends on the Neon trusted-origins configuration, so asserting one
specific message would leave the suite red for a reason unrelated to this code.

A successful sign-in is **not** covered. It needs a real Neon Auth user and a
matching `admins` row, neither of which the harness provisions, so such a test
would pass for the wrong reason. It is the same gap that keeps the admin pages
without render-level e2e coverage.

## Non-Goals

- `register/page.tsx` is left unwired. Self-registration in an allowlisted admin
  tool with exactly one `admins` record has no legitimate use, and wiring it
  would be a product decision rather than a fix. Already raised with the
  maintainer, who chose to leave the page in place.
- The broken `/assets/sic_logo_nobg.png` on the sign-in screen. Pre-existing from
  the frontend merge and unrelated to auth: the file is a valid 1254x1254 PNG
  with correct magic bytes, and `sharp` reads and resizes it without complaint,
  so the failure is in Next's image optimizer rather than the asset. Worth its
  own issue.
- Reconciling the 14 pre-existing stale TSK rows or the 47 reverse-matrix rows.
  Only the TSK-0201 row changes here.

## Acceptance Criteria

- `GET /login` renders the sign-in form and submitting it issues a request to
  `/api/auth/sign-in/email` with `{ email, password }`.
- A failed sign-in shows plain-language operator copy, never an API error string,
  and never leaks whether an address is registered.
- The form cannot be double-submitted and re-enables on failure.
- `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e` pass.
- TSK-0201 remains `[/] In Progress` until a session can actually be established.

## PR Stacking

Stacked on `feat/tsk-0203-unauthorized-page`, which is stacked on
`fix/tsk-0201-sign-in-redirect`. Merge in that order, rebasing each onto `dev`
as it lands:

1. `fix/tsk-0201-sign-in-redirect`
2. `feat/tsk-0203-unauthorized-page`
3. `feat/tsk-0204-sign-in-form` (this branch)
