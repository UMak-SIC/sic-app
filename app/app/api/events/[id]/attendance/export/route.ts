import { requireAdmin } from "@/lib/auth/require-admin";
import { exportEventParticipants } from "@/lib/services/participant-export-service";
import { csvAttachment } from "@/lib/csv";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) {
    return authorization;
  }

  const { id } = await params;
  const { events, csv } = await exportEventParticipants(id);
  const event = events[0];

  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  return csvAttachment(csv, `${event.name}-participants.csv`);
}
