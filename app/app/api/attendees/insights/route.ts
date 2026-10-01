import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrganizationTimezone } from "@/lib/events/organization-timezone";
import { getCourseParticipation } from "@/lib/services/attendee-insights-service";

export const runtime = "nodejs";

/**
 * `GET /api/attendees/insights` — course participation, for the directory's
 * insights card.
 *
 * Separate from `GET /api/attendees` because it is an aggregate over the whole
 * registry rather than a page of it. The list endpoint pages at up to 100 rows, so
 * anything computed from one page would describe a page rather than the directory.
 *
 * `timezone` rides along for the same reason `/api/events` and `/api/attendees`
 * include it, so the card formats anything time-based identically to the table above
 * it.
 */
export async function GET(): Promise<Response> {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) {
    return authorization;
  }

  const result = await getCourseParticipation();

  return Response.json({ ...result, timezone: getOrganizationTimezone() });
}