import "server-only";

import { getPrismaClient } from "@/lib/prisma";

import { getNeonAuth } from "./server";

export async function requireAdmin(): Promise<Response | { adminId: string }> {
  const { data: session } = await getNeonAuth().getSession();
  const adminId = session?.user?.id;

  if (!adminId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await getPrismaClient().admin.findUnique({
    where: { neonAuthUserId: adminId },
    select: { neonAuthUserId: true },
  });

  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return { adminId };
}
