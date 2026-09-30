## Goal

Protect administrator pages at the network boundary with the Next.js 16 proxy
so unauthenticated visitors cannot reach `/checkin` or the event attendance
routes, while leaving the auth handler, API routes, and the public home page
reachable.

This closes a live security exposure: `app/app/checkin/page.tsx` was a
`"use client"` page with no `requireAdmin()` call and no proxy, so any
unauthenticated visitor could load the QR scanner.

## Source Of Truth

- GitHub child issue [#17: TSK-0202 admin authorization guard](https://github.com/UMak-SIC/sic-app/issues/17)
- GitHub child issue [#16: TSK-0201 Neon Managed Better Auth sign-in](https://github.com/UMak-SIC/sic-app/issues/16) (partially: the proxy and session-wiring half only)
- GitHub epic [#55: EPIC-02 Authentication & Administrator Authorization](https://github.com/UMak-SIC/sic-app/issues/55)
- `docs/traceability-matrix.md` (TSK-0201, TSK-0202, US-01, US-02, DMA-01, NFR-03)
- `.agents/skills/neon-auth/references/managed-auth.md` (Next 16 `auth.middleware` pattern)
- `app/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- `CONTEXT.md` (Admin definition)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider
traceability matrix are historical/derived context, not decision inputs.

## Non-Goals

- The `app/app/(auth)/` sign-in form. TSK-0201 keeps that half open.
- TSK-0203 (#18), the unauthorized access-denial page.
- The TTM-0202 redesign of the attendance page's `notFound()` handling. The
  proxy handles the unauthenticated redirect; `require-admin.ts` keeps
  returning 401/403 for API routes.
- Reconciling the 14 pre-existing stale TSK rows or the 47 reverse-matrix rows.

## Execution Order

Single vertical slice: add the proxy, prove the matcher, verify the redirect.

## PR Stacking Strategy

```
dev
`-- feat/tsk-0201-0202-route-protection -> dev
```

Independent of the other stacks. Branch from `dev`, PR targets `dev`.

## Linear Sub-Issue Tracking

No Linear project is configured. Epic #55 owns children #16, #17, and #18.
This PR completes #17 and half of #16.

### 1. Add `app/proxy.ts` at the project root

- Use the installed SDK's own guard rather than hand-rolled cookie parsing:
  `getNeonAuth().middleware({ loginUrl: "/auth/sign-in" })` from
  `@neondatabase/auth/next/server` 0.5.0-beta.
- **`proxy.ts` must sit at the Next.js project root (`app/proxy.ts`), beside
  `next.config.ts`, not inside `app/app/`.** Next.js resolves the convention
  file from `rootDir = path.join(appDir, "..")` and only accepts it when
  `isAtConventionLevel` is true, i.e. `fileDir` is `/` or `/src`. A proxy
  placed inside `app/app/` is silently ignored: the build succeeds, the route
  table shows no `ƒ Proxy (Middleware)` entry, and every request passes
  through. Verify that marker appears in the build output.
- `loginUrl` already defaults to `/auth/sign-in`; pass it explicitly.
- That page is not built in this PR, so unauthenticated visitors land on a
  404 until TSK-0201's UI half lands. The security boundary is correct now.

### 2. Scope `config.matcher` to page routes only

- `matcher: ["/checkin/:path*", "/events/:path*"]`.
- API routes must **not** be matched. They carry their own `requireAdmin()`
  and must keep answering 401/403; a proxy redirect would turn a JSON 401 into
  an HTML 307.
- `/api/auth/**` must stay reachable or sign-in cannot work. It is excluded
  because the matcher is anchored at the path start.
- The public home page `/` stays public. `/` is the org's central website, not
  an admin surface.

### 3. Keep authorization out of the proxy

The Next.js 16 guide states proxy is for optimistic redirects and "should not be
used as a full session management or authorization solution". So:

- Proxy: session presence only, redirect to sign-in.
- `app/lib/auth/require-admin.ts`: the authoritative `admins.neon_auth_user_id`
  lookup for API routes and server components. Already implemented; unchanged.

### 4. Cover the matcher and the wiring

- `app/tests/proxy.test.ts` asserts the middleware receives
  `{ loginUrl: "/auth/sign-in" }`, that `/checkin` and `/events/**` are guarded,
  and that `/`, `/api/auth/**`, other `/api/**` routes, and static assets are
  not.
- The test needs `vi.resetModules()` plus a dynamic import: the wiring happens
  at module-evaluation time, so a static import runs `getNeonAuth()` before any
  `beforeEach` mock return value is installed.
- Mock return values must be assigned inside the `vi.hoisted` callback for the
  same reason.

### 5. Document the local secret requirement

`NEON_AUTH_COOKIE_SECRET` is absent from `app/.env.example` ordering concerns
aside, it is required at **build** time now, because Next.js evaluates
`proxy.ts` to read `config.matcher`. Without it the build fails with
`NEON_AUTH_COOKIE_SECRET is required to initialize Neon Auth.`

- The var is already documented in `app/.env.example`; no change needed there.
- Local `.env.local` is gitignored and must carry a generated 32+ character
  value, since the SDK's `validateCookieConfig` throws below that length.

## Acceptance Criteria

- `pnpm build` output lists `ƒ Proxy (Middleware)`, proving the file is at the
  path Next.js actually reads.
- `GET /checkin` with no session returns `307` to `/auth/sign-in`.
- `GET /events/<uuid>/attendance` with no session returns `307` to
  `/auth/sign-in`.
- `GET /` returns `200` and `GET /api/auth/get-session` returns `200`.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.
- TSK-0202 marked `[x] Completed` and TSK-0201 marked `[/] In Progress` in
  `docs/traceability-matrix.md`.
- Issue #17 closed; issue #16 left open with a note that the sign-in page
  remains.
