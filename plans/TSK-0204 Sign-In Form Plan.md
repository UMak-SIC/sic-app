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

It stays In Progress after this branch, because the `admins` table was empty. That
is the only remaining blocker; the two origin and HTTPS blockers originally listed
here were both incorrect and are corrected below.

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

**The SDK client is used because it is the documented path**, not because a
hand-rolled fetch was shown to fail. An earlier draft of this file claimed a raw
fetch to `/api/auth/sign-in/email` gets `403 {"code":"INVALID_ORIGIN"}`. That
403 was really the `127.0.0.1` origin failing the allowlist, and a plain fetch
from `localhost` succeeds. The reference is also explicit that the Managed client
is not interchangeable with bare `better-auth/client`, which is the real reason to
use it.

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

## Correction: Neither Local Blocker Is Real

This file originally claimed two blockers that stop local sign-in. **Both were
wrong**, and both were the result of testing on `127.0.0.1` and reasoning from a
cookie flag instead of testing a browser. Corrected 2026-09-30.

### Origin allowlist: localhost is pre-approved

`.agents/skills/neon-auth/SKILL.md` states it: *"Localhost ports are
pre-approved by default."* The 403s that produced this section all came from
serving on `127.0.0.1`, which is not `localhost` as far as the allowlist is
concerned. Same request, same server, only the `Origin` header differs:

```
POST /api/auth/sign-in/email   Origin: http://localhost:3300   ->  200
POST /api/auth/sign-in/email   Origin: http://127.0.0.1:3300   ->  403 INVALID_ORIGIN
```

**No Neon console change is needed for local development.** The allowlist only
matters for a deployed origin, which is not localhost. `NeonAuthConfig` still has
no `trustedOrigins` option, so a deployed host must be registered on the Neon Auth
instance:

```bash
neon neon-auth domain list
neon neon-auth domain add https://your-app.vercel.app
```

Include the scheme, omit the trailing slash, and register preview origins as well
as production.

### `__Secure-` cookies: localhost is a secure context

`NEON_AUTH_COOKIE_PREFIX` is the hardcoded constant `"__Secure-neon-auth"`, so the
session cookies are always issued with the `Secure` attribute. That is true, and
it was the basis for claiming local dev needs HTTPS.

It does not follow. Browsers treat `http://localhost` as a secure context, so
`Secure` cookies are permitted there. A real browser, against a real server, over
plain HTTP:

```
URL=http://localhost:3300/overview
COOKIES=[{"name":"__Secure-neon-auth.session_token","secure":true,"httpOnly":true},
         {"name":"__Secure-neon-auth.local.session_data","secure":true,"httpOnly":true}]
ALERT=(none)
HEADING=DASHBOARD
OVERVIEW_URL=http://localhost:3300/overview
```

Sign-in completed, both cookies were stored and sent, `/overview` rendered, and a
fresh navigation to it stayed put.

**`next dev --experimental-https` is not needed for local sign-in.** Plain
`next dev` on `localhost` works.

### Also unproven: that a raw fetch is rejected

This file previously stated that a hand-rolled `fetch` to
`/api/auth/sign-in/email` gets `INVALID_ORIGIN` and that this is why the SDK
client is used. That was not established either — the 403 came from the
`127.0.0.1` origin, not from using `fetch`. A plain fetch to the same endpoint
from `localhost` succeeds.

The client is still correct, because it is the documented path and the skill
reference is explicit that the Managed client is not interchangeable with bare
`better-auth/client`. But it is used because it is documented, not because the
alternative was shown to be broken.

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
4. Sign in at `/login`, served from **`localhost`**.

Two things that are not steps: no Neon console change is needed for local
development, and `--experimental-https` is not needed either. Both were
previously listed here and both were wrong. A deployed origin does need
registering with `neon neon-auth domain add`.

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
