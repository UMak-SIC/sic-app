import type { NextRequest } from "next/server";

import { getNeonAuth } from "@/lib/auth/server";

// Protects administrator pages at the network boundary. The SDK middleware
// redirects unauthenticated visitors to the sign-in route; authorization
// against the single admins record stays in require-admin.ts so API routes
// keep returning 401/403 instead of a redirect.
//
// loginUrl must match the route the sign-in page actually serves. It lives at
// app/app/(auth)/login/page.tsx, which the (auth) route group exposes as
// /login. Pointing this at /auth/sign-in sent every unauthenticated visitor to
// a 404, because no such route exists.
//
// The matcher covers page routes only. API routes carry their own
// requireAdmin() checks and must keep answering 401/403, and /api/auth/** has
// to stay reachable so visitors can sign in.
//
// The auth client is resolved per request rather than at module scope. Building
// it during module evaluation made a missing NEON_AUTH_BASE_URL or
// NEON_AUTH_COOKIE_SECRET throw while the module loaded, which takes down every
// request the proxy touches rather than only the guarded routes, and fails a
// build or test run that has no auth configuration. Resolving it here confines a
// misconfiguration to the routes that actually need authentication.
export function proxy(request: NextRequest) {
  return getNeonAuth().middleware({ loginUrl: "/login" })(request);
}

export default proxy;

// The matcher excludes only what has to stay reachable: the two auth screens
// (so a bounced visitor can sign in), the auth handler and the rest of /api
// (API routes carry their own requireAdmin() and must keep answering JSON
// 401/403 rather than an HTML 307), and static assets.
//
// `.*[^/]*\.[^/]*$` is what makes "static assets" true. Excluding only
// _next/static, _next/image and favicon.ico left every file served out of
// public/ inside the guarded set, so the logo and the sidebar mascot were sent
// through the auth middleware and came back as an HTML page with a 200.
// next/image then reported the response as "not a valid image, received null",
// which reads like a corrupt file and is not one.
//
// The dot has to be in the *last* path segment. A plain `.*\..*` would also
// exclude a dotted directory, leaving every admin page beneath it unguarded, so
// the segment before the dot cannot span a slash. No page route in this app
// contains a dot in its final segment, so this does not weaken the default.
//
// This started as an allowlist of ["/checkin/:path*", "/events/:path*"], which
// was correct when those were the only admin pages. The frontend merge added
// /attendees, /assets, /campaign, /overview, and /settings, and every one of
// them answered 200 with no session. A deny-by-default matcher means the next
// admin page added is protected without anyone having to remember this file.
//
// `/` is intentionally not excluded. app/app/page.tsx redirects it to
// /overview, so excluding the root would only move the login wall one hop
// away; this app is an internal tool and the whole surface sits behind sign-in.
export const config = {
  matcher: [
    "/((?!login|register|api|_next/static|_next/image|favicon.ico|.*[^/]*\\.[^/]*$).*)",
  ],
};
