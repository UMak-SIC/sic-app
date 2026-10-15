import { connection } from "next/server";
import { redirect } from "next/navigation";

import { QrScanner } from "@/components/scanner/QrScanner";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listEvents } from "@/lib/services/event-service";

export default async function CheckInPage() {
  await connection();

  const authorization = await requireAdmin();
  if (authorization instanceof Response) {
    redirect(authorization.status === 401 ? "/login" : "/unauthorized");
  }

  const events = await listEvents();

  return (
    <main className="min-h-[100dvh] bg-canvas px-4 py-8 text-ink sm:px-6">
      <div className="mx-auto max-w-md">
        <QrScanner
          events={events
            .filter((event) => event.status === "PUBLISHED")
            .map((event) => ({ id: event.id, name: event.name }))}
        />
      </div>
    </main>
  );
}
