import { requireAdminPage } from "@/lib/auth/require-admin-page";

import { AppShell } from "@/components/layout/app-shell";

// Every Event Management screen is nested under (tabs), so one check here covers
// all of them and a new page cannot forget it. Calling auth from the layout
// makes these routes dynamic instead of prerendered, which is the cost of
// guarding them on the server.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return <AppShell>{children}</AppShell>;
}
