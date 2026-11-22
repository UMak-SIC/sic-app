import "server-only";

import { getOrganizationDate } from "@/lib/events/organization-timezone";
import { getPrismaClient } from "@/lib/prisma";

import { getNeonAuth } from "./server";

/**
 * Allows a signed-in person whose allowlist entry is active (AC-02).
 *
 * Checked on every request, so a removed entry or one whose end date has passed
 * is refused at once (AC-02.7, AC-04.8). The end date includes its whole day in
 * the organization timezone.
 */
export async function requireAdmin(): Promise<Response | { adminId: string }> {
  const { data: session } = await getNeonAuth().getSession();
  const adminId = session?.user?.id;

  if (!adminId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await getPrismaClient().allowlistEntry.findFirst({
    where: {
      neonAuthUserId: adminId,
      removedAt: null,
      OR: [{ accessEndsOn: null }, { accessEndsOn: { gte: getOrganizationDate() } }],
    },
    select: { neonAuthUserId: true },
  });

  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return { adminId };
}
