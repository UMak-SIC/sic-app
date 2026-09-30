import { timingSafeEqual } from "node:crypto";

import { closeExpiredEvents } from "@/lib/services/event-close-service";

export const runtime = "nodejs";

function hasValidCronSecret(value: string | null): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret?.trim()) {
    throw new Error("CRON_SECRET is required.");
  }

  if (!value || value.length !== secret.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(value), Buffer.from(secret));
}

export async function POST(request: Request): Promise<Response> {
  let authorized: boolean;

  try {
    authorized = hasValidCronSecret(request.headers.get("X-Cron-Secret"));
  } catch {
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  if (!authorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await closeExpiredEvents();
  return Response.json(result);
}
