import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

import { AppShell } from "@/components/layout/app-shell";

// The proxy decides whether there is a session at all. It cannot decide whether
// that session belongs to the single admins record, so this layout is where the
// authorization half of EPIC-02 is enforced for pages.
//
// requireAdmin() resolves the same 401/403 contract the API routes use, which
// keeps one rule for both surfaces. A 401 here should be unreachable, because
// the proxy bounces sessionless visitors to /login before a page renders; it is
// still handled so a future matcher change cannot turn a missing check into a
// silently public dashboard.
//
// This lives here rather than in each page because every admin screen is nested
// under (tabs), so one check covers all of them and a new page cannot forget it.
// Calling auth from the layout makes these routes dynamic instead of
// prerendered, which is the cost of guarding them on the server.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Stop prerendering here, before the auth call below.
  //
  // requireAdmin() reads the session through the Neon Auth SDK, which does not
  // go through next/headers directly, so Next's static analysis sees no
  // request-time API and tries to prerender these pages at build time. On a
  // build host without NEON_AUTH_BASE_URL that threw "NEON_AUTH_BASE_URL is
  // required to initialize Neon Auth" and failed the build on /attendees.
  // Locally the same call returned a 401 and redirected, which Next tolerates,
  // so the failure only ever appeared on the deploy host.
  //
  // connection() is the documented way to say "this output depends on the
  // request" when no request-time API is visible. These pages are authorized per
  // request, so they must never be baked.
  await connection();

  const auth = await requireAdmin();

  if (auth instanceof Response) {
    redirect(auth.status === 401 ? "/login" : "/unauthorized");
  }

  return <AppShell>{children}</AppShell>;
}
