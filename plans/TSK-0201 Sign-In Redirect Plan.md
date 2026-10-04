## Goal

Point the proxy's `loginUrl` at a route that exists, so unauthenticated
administrators land on the sign-in form instead of a 404, and close TSK-0201.

## Source Of Truth

- GitHub child issue [#16: TSK-0201 Neon Managed Better Auth sign-in](https://github.com/UMak-SIC/sic-app/issues/16)
- GitHub epic [#55: EPIC-02 Authentication & Administrator Authorization](https://github.com/UMak-SIC/sic-app/issues/55)
- `docs/traceability-matrix.md` (TSK-0201, US-01, DMA-01)
- `app/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- `plans/TSK-0201-0202 Route Protection Plan.md` (the original half-open decision)
- `CONTEXT.md` (Admin definition)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider
traceability matrix are historical/derived context, not decision inputs.

## The Defect

`TSK-0201-0202 Route Protection Plan.md` chose `loginUrl: "/auth/sign-in"`
because that is the `@neondatabase/auth` SDK default, and recorded the
consequence honestly: the page did not exist, so unauthenticated visitors
landed on a 404 while the security boundary stayed correct.

The sign-in page now exists, at `app/app/(auth)/login/page.tsx`. The
`(auth)` route group is a grouping convention, not a path segment, so the page
serves at **`/login`**. There is no `/auth/sign-in` route.

The result was that every protected page 307'd into a 404:

| Request | Response | Landed on |
| --- | --- | --- |
| `GET /checkin` | 307 → `/auth/sign-in` | 404 |
| `GET /events/<uuid>/attendance` | 307 → `/auth/sign-in` | 404 |

`pnpm build` reported the route table with `○ /login` and no
`/auth/sign-in`, which is the evidence the path was wrong.

## Decision

`loginUrl: "/login"`, matching the route the sign-in page actually serves.

The alternative was moving the page to `app/app/auth/sign-in/page.tsx` to match
the SDK default. Rejected: it renames a working, already-built page to fit a
library's default, and `(auth)` is the conventional grouping for auth screens.
The redirect target belongs to the app, not the SDK.

Pass `loginUrl` explicitly rather than leaning on the default. The default is
the SDK's, and this app's sign-in route is not the SDK's.

## Changes

- `app/proxy.ts`: `loginUrl` → `"/login"`, with a comment recording that the
  value must match the route the page serves and why it previously did not.
- `app/tests/proxy.test.ts`: assert `middleware` receives `{ loginUrl: "/login" }`.
- `app/tests/e2e/route-protection.spec.ts`: `SIGN_IN` → `"/login"`.
- `docs/traceability-matrix.md`: TSK-0201 → `[x] Completed`.

## Strengthening The E2E Guard

The existing e2e test was `lands a browser on the sign-in route`, which
asserted only the URL after `page.goto("/checkin", { waitUntil: "commit" })`.
It passed against a 404, because the redirect *was* happening — just to a
non-existent route. A redirect to nowhere looks identical to a working
redirect when you only assert the destination.

It now asserts the response status is `200` and that the sign-in form renders
(`Welcome back` heading, an `Email` field), so a redirect to a missing route
fails the suite instead of passing it.

## Non-Goals

- TSK-0203 (#18), the unauthorized access-denial page.
- Removing `app/app/(auth)/register/page.tsx`. Self-registration in an
  allowlisted admin app is worth a decision, but a registered non-admin is
  refused by `require-admin.ts` anyway, so it is not a hole. Noted, not touched.
- Reconciling the 14 pre-existing stale TSK rows or the 47 reverse-matrix rows.

## Acceptance Criteria

- `pnpm build` output lists `ƒ Proxy (Middleware)`.
- `GET /checkin` with no session returns `307` to `/login`.
- `GET /events/<uuid>/attendance` with no session returns `307` to `/login`.
- Following the redirect in a browser returns `200` and renders the sign-in
  form, not a 404.
- `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e` pass.
- TSK-0201 marked `[x] Completed` in `docs/traceability-matrix.md`.

## Verification Notes

The e2e run collides with an already-running `next dev` on port 3000, because
Playwright starts its own server on 3100 and Next.js refuses to boot a second
dev server. Running with `CI=true` makes `playwright.config.ts` use
`next start` instead, which sidesteps the dev-server lock and matches CI. The
build must be re-run first, since `next start` serves the built output.

The sign-in form's email field has `id="username"` but its `<label>` reads
"Email", so the accessible name is `Email` and assertions must target that, not
the id.
