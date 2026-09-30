import { timingSafeEqual } from "node:crypto";

import { runRetention } from "@/lib/services/retention-service";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const expected = process.env.RETENTION_CRON_SECRET;
  const provided = request.headers.get("X-Retention-Cron-Secret");

  if (!expected || !provided || Buffer.byteLength(expected) !== Buffer.byteLength(provided)) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export async function POST(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRetention();

  return Response.json({ ...result, cutoff: result.cutoff.toISOString() });
}
