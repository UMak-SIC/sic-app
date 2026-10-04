import { requireAdmin } from "@/lib/auth/require-admin";
import { getEventRegistrationBreakdown } from "@/lib/services/attendance-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  const registrations = await getEventRegistrationBreakdown((await params).id);
  return registrations
    ? Response.json({ registrations })
    : Response.json({ error: "Event not found." }, { status: 404 });
}
