import { requireAdmin } from "@/lib/auth/require-admin";
import { csvAttachment } from "@/lib/csv";
import { readExportIds } from "@/lib/export-request";
import { exportParticipants } from "@/lib/services/participant-export-service";

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;
  const ids = await readExportIds(request);
  if (!ids) return Response.json({ error: "Choose at least one student to export." }, { status: 400 });
  return csvAttachment(await exportParticipants(ids), "student-directory.csv");
}
