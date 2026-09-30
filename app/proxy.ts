import { getNeonAuth } from "@/lib/auth/server";

// Protects administrator pages at the network boundary. The SDK middleware
// redirects unauthenticated visitors to the sign-in route; authorization
// against the single admins record stays in require-admin.ts so API routes
// keep returning 401/403 instead of a redirect.
//
// The matcher covers page routes only. API routes carry their own
// requireAdmin() checks and must keep answering 401/403, and /api/auth/** has
// to stay reachable so visitors can sign in.
export default getNeonAuth().middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: ["/checkin/:path*", "/events/:path*"],
};
