import { requireAdmin } from "@/lib/auth/require-admin";
import { EventLifecycleError, publishEvent } from "@/lib/services/event-service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  try {
    await publishEvent((await params).id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof EventLifecycleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
