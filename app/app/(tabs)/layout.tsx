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
  const auth = await requireAdmin();

  if (auth instanceof Response) {
    redirect(auth.status === 401 ? "/login" : "/unauthorized");
  }

  return <AppShell>{children}</AppShell>;
}
