import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrganizationTimezone } from "@/lib/events/organization-timezone";
import { getCourseParticipation } from "@/lib/services/participation-service";

export const runtime = "nodejs";

/**
 * `GET /api/events/participation` — students of each course who took part in each
 * event.
 *
 * Backs the directory's course participation chart, which is per event rather than
 * per day: the question it answers is "how did each course do at each event", and a
 * daily axis would answer a question nobody asked about a range of days in which
 * nothing happened.
 *
 * The organization timezone rides along, the same way `/api/events` and
 * `/api/attendees` return it, so the chart formats event dates the same way
 * everywhere else on the page.
 */
export async function GET(): Promise<Response> {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) {
    return authorization;
  }

  const participation = await getCourseParticipation();

  return NextResponse.json({
    ...participation,
    timezone: getOrganizationTimezone(),
  });
}