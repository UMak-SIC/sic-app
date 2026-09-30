## Goal

Deny non-allowlisted operators access to the administration pages, and give
them a plain-language screen that explains why, which is TSK-0203 and US-02.

## Source Of Truth

- GitHub child issue [#18: TSK-0203 unauthorized access denial page](https://github.com/UMak-SIC/sic-app/issues/18)
- GitHub epic [#55: EPIC-02 Authentication & Administrator Authorization](https://github.com/UMak-SIC/sic-app/issues/55)
- `docs/traceability-matrix.md` (TSK-0203, TSK-0202, US-02, DMA-01)
- `DESIGN.md` (design tokens, typography, radius scale, plain-language policy)
- `AGENTS.md` (design charter, pre-flight checklist)
- `app/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- `app/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/unauthorized.md`
- `CONTEXT.md` (Admin definition)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider
traceability matrix are historical/derived context, not decision inputs.

## Why The Scope Grew

The matrix scopes TSK-0203 to `app/app/unauthorized/page.tsx`. That file alone
cannot satisfy its own verification criterion, "Non-allowlisted user sees
access-denied screen". Two things were missing.

**Nothing enforced it.** `app/app/(tabs)/layout.tsx` rendered `<AppShell>` with
no `requireAdmin()` call, so a signed-in non-admin loaded every admin page. The
proxy only decides whether a session exists, never whether that session is on
the `admins` allowlist.

**Six admin pages answered 200 with no session at all.** The proxy matcher was
an allowlist, `["/checkin/:path*", "/events/:path*"]`, written when those were
the only admin pages. The frontend merge added six more. Verified with no
session cookie against a running server:

| Path | Before | Cause |
| --- | --- | --- |
| `/attendees` | 200 | outside the matcher |
| `/assets` | 200 | outside the matcher |
| `/campaign` | 200 | outside the matcher |
| `/campaign/new` | 200 | outside the matcher |
| `/overview` | 200 | outside the matcher |
| `/settings` | 200 | outside the matcher |

Nothing leaked yet, because every one of those pages still renders seed data.
Each is scheduled to show real data, so the exposure was one wiring commit away
from a public attendee registry.

This also retired an assumption in `TSK-0201-0202 Route Protection Plan.md`:
that `/` is "the org's central website, not an admin surface".
`app/app/page.tsx` is now `redirect("/overview")`, so the root URL is the admin
dashboard. Excluding `/` would only have moved the login wall one hop away.

Decisions taken, confirmed by the maintainer:

- Protect every admin surface, and re-open TSK-0202, which was marked complete
  while six pages were unguarded.
- The whole app is login-gated. `/` stays a redirect to `/overview` and the
  proxy guards both, so an unauthenticated visitor to the root is bounced to
  `/login`. Consistent with an internal tool for student leaders.
- Leave `app/app/(auth)/register/page.tsx` in place. A registered non-admin is
  refused by `require-admin.ts` regardless, so it is not a hole. Worth a
  decision later; not a security fix.

## Changes

### `app/proxy.ts` — deny by default

```ts
matcher: ["/((?!login|register|api|_next/static|_next/image|favicon.ico).*)"]
```

A negative matcher rather than a longer allowlist, so the next admin page
someone adds is protected without anyone remembering to edit this file. The
exclusions are only what genuinely has to stay reachable: the two auth screens,
`/api/**` (which answers JSON 401/403 from its own `requireAdmin()` and must not
become an HTML 307), and static assets, which still have to load on the sign-in
screen.

### `app/app/(tabs)/layout.tsx` — authorize once, for every admin page

Calls `requireAdmin()` and maps the existing 401/403 contract onto redirects:
401 to `/login`, 403 to `/unauthorized`. One rule shared with the API routes.

It lives in the layout rather than in each page because every admin screen is
nested under `(tabs)`, so one check covers all of them and a new page cannot
forget it. A 401 is unreachable in practice, since the proxy bounces sessionless
visitors first; it is still handled so a future matcher change cannot quietly turn
a missing check into a public dashboard.

Cost: these routes stop being prerendered. `pnpm build` now reports `/attendees`,
`/assets`, `/campaign`, `/campaign/[id]`, `/campaign/new`, `/events`,
`/events/**`, `/overview`, and `/settings` as `ƒ (Dynamic)`. That is the price of
authorizing them on the server, and it is the correct trade.

### `app/app/unauthorized/page.tsx` — the denial screen

A plain page route, deliberately outside `(tabs)` so it renders without
`AppShell` and therefore without the sidebar, header, or any other admin
navigation. US-02 requires none of that on a refusal.

Not Next's `unauthorized()` convention file: that is experimental and answers
`401`, which is the wrong status. The visitor is signed in and simply not
allowlisted, which is `403`.

Copy is plain and operator-first per `DESIGN.md`: no status codes, no
`admins.neon_auth_user_id`, no "authorization". It says the account is not on
the list, that nothing confidential is shown, and how to get added. Actions are
"Back to sign in" and "Sign out", so a refused operator is not stranded in a
signed-in state.

Design charter compliance: `bg-canvas`/`bg-paper`/`text-ink`/`text-muted`/
`border-line` tokens only, no hex literals; `font-display` (Agrandir) for the
heading and `font-sans` (Montserrat) for body; `rounded-[12px]` and
`rounded-[16px]` from the six-tier scale; `min-h-[100dvh]`, never `h-screen`;
`@phosphor-icons/react` SSR build at `24px bold` for the status icon and `18px
regular` on the buttons, each paired with a text label.

### Sign-out takes a client component, deliberately

The first draft made "Sign out" an `<a href="/api/auth/sign-out">`. That is
wrong twice over, and both reasons were found by reading the SDK rather than
assuming.

**A link issues a GET; sign-out is a POST.** `@neondatabase/auth` wraps
better-auth 1.6.23, and `dist/api/routes/sign-out.mjs` declares
`method: "POST"`, `requireHeaders: true`, and no request body. A GET would be
rejected. It also tripped `@next/next/no-html-link-for-pages`, which pointed at
the same problem.

**A server action cannot do it either.** Calling the sign-out endpoint from a
server action means `fetch`-ing the app's own route and forwarding the cookie
by hand. better-auth clears the session by returning `Set-Cookie`; a
server-side fetch would receive that header and drop it, leaving the browser
holding a live session. Calling the SDK's own `signOut` is not an option
because `NeonAuthServer` is `Pick<VanillaBetterAuthClient, ServerAuthMethods>`,
so the method is client-shaped — `getNeonAuth().signOut({ query, fetchOptions })`
— and takes no request headers, which the typechecker confirmed.

So `app/app/unauthorized/sign-out-button.tsx` is a `"use client"` component that
POSTs from the browser, where `Set-Cookie` applies, then navigates with
`router.replace("/login")` and `router.refresh()`. The endpoint answers
`{"success":true}` rather than redirecting, so the navigation has to be explicit
or the operator lands on a JSON body. The button carries a pending state and
`aria-busy`, and re-enables on failure rather than stranding them.

## Test Changes

**`app/tests/proxy.test.ts`** — the matcher helper gained a branch for negative
lookahead patterns, since the old segment-splitter only understood
`/checkin/:path*`. Assertions now cover all six previously public screens plus
`/`, and the exclusions.

**`app/tests/app/tabs-layout.test.tsx`** (new) — covers all three outcomes of
`requireAdmin()`: admin renders the shell, 403 redirects to `/unauthorized`
without rendering the shell, 401 redirects to `/login`. `redirect()` is mocked
to throw, because Next signals by throwing and the layout would otherwise fall
through and render the shell it was refusing.

**`app/tests/e2e/route-protection.spec.ts`** — added coverage that the six
previously public screens now 307 to `/login`, that `/login` itself stays
reachable, and that `/` is behind sign-in.

## One False Pass Removed

`app/tests/e2e/home.spec.ts` was `renders the home page`: it visited `/` and
asserted a heading matching `/welcome back|good day/i`. With the root now behind
sign-in, that visit lands on `/login`, whose heading is "Welcome back!" — so the
test kept passing while no longer testing the home page. It now asserts the URL
is `/login` and is named for what it checks.

Testing the real `/overview` render needs an authenticated fixture, which this
harness does not set up. Route protection is covered in
`route-protection.spec.ts`; this test only pins what a sessionless visitor sees.

## Non-Goals

- An authenticated e2e fixture. Recorded as the gap that keeps the admin pages
  from having render-level e2e coverage.
- Removing `app/app/(auth)/register/page.tsx`.
- The `--cyan` versus `--green` accent question. `DESIGN.md` §4 names cyan as
  the one accent; the shipped sign-in screen uses green, and both are real
  tokens in `globals.css`. The denial page matches the adjacent sign-in screen
  rather than introducing a third look. Worth settling with the design owner.
- Reconciling the 14 pre-existing stale TSK rows or the 47 reverse-matrix rows.
  Only the TSK-0203 row is flipped here.

## Acceptance Criteria

- `pnpm build` output lists `ƒ Proxy (Middleware)`, and the guarded pages are
  `ƒ (Dynamic)`.
- Every admin path returns `307` to `/login` with no session, including `/`.
- `/login` and `/register` return `200` so a bounced visitor can sign in.
- `/api/**` still answers `401`/`403` as JSON and is not turned into a redirect.
- A signed-in non-admin is redirected to `/unauthorized`, which renders without
  admin navigation.
- `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e` pass.
- TSK-0203 marked `[x] Completed` in `docs/traceability-matrix.md`.

## PR Stacking

Stacked on `fix/tsk-0201-sign-in-redirect`, which this branch carries as its
parent commit. Merge that first, then rebase this branch onto `dev`; the TSK-0203
delta is preserved.
