import { requireAdminPage } from "@/lib/auth/require-admin-page";

// The QR Generator sits behind the same admin check as Event Management, so
// every screen added under /qr is guarded without having to remember it.
export default async function QrGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return children;
}
