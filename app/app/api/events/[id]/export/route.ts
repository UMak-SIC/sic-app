import { requireAdmin } from "@/lib/auth/require-admin";
import { csvAttachment } from "@/lib/csv";
import { readExportIds } from "@/lib/export-request";
import { exportEvents } from "@/lib/services/participant-export-service";

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const ids = await readExportIds(request);
  if (!ids) return Response.json({ error: "Choose at least one event to export." }, { status: 400 });
  const { csv } = await exportEvents(ids);
  return csvAttachment(csv, "umak-sic-events.csv");
}
