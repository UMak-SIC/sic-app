import type { NextRequest } from "next/server";

import { getNeonAuth } from "@/lib/auth/server";

// Protects administrator pages at the network boundary. The SDK middleware
// redirects unauthenticated visitors to the sign-in route; authorization
// against the single admins record stays in require-admin.ts so API routes
// keep returning 401/403 instead of a redirect.
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
  return getNeonAuth().middleware({ loginUrl: "/auth/sign-in" })(request);
}

export default proxy;

export const config = {
  matcher: ["/checkin/:path*", "/events/:path*"],
};
