import { requireAdmin } from "@/lib/auth/require-admin";
import { csvAttachment } from "@/lib/csv";
import { readExportIds } from "@/lib/export-request";
import { exportEvents } from "@/lib/services/participant-export-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const ids = await readExportIds(request);
  if (!ids) return Response.json({ error: "Choose at least one event to export." }, { status: 400 });
  // The path names the first exported event; it must be part of the selection.
  const { id } = await params;
  if (!ids.includes(id)) return Response.json({ error: "Choose at least one event to export." }, { status: 400 });
  const { csv } = await exportEvents(ids);
  return csvAttachment(csv, "umak-sic-events.csv");
}
