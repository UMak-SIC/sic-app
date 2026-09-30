import { requireQueueWorker } from "@/lib/auth/require-queue-worker";
import { getPrismaClient } from "@/lib/prisma";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function enqueueQueueJob(request: Request): Promise<Response> {
  const unauthorized = requireQueueWorker(request);
  if (unauthorized) {
    return unauthorized;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const deliveryId =
    typeof payload === "object" && payload !== null && "deliveryId" in payload
      ? payload.deliveryId
      : undefined;

  if (typeof deliveryId !== "string" || !UUID_PATTERN.test(deliveryId)) {
    return Response.json({ error: "deliveryId must be a UUID." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const delivery = await prisma.emailDelivery.findUnique({
    where: { id: deliveryId },
    select: { id: true },
  });

  if (!delivery) {
    return Response.json({ error: "Delivery not found." }, { status: 404 });
  }

  const queueJob = await prisma.queueJob.upsert({
    where: { deliveryId },
    create: { deliveryId },
    update: {},
    select: { id: true },
  });

  return Response.json({ queueJobId: queueJob.id }, { status: 200 });
}

export { enqueueQueueJob as POST };
