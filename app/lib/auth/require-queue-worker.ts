import "server-only";

import { timingSafeEqual } from "node:crypto";

const QUEUE_WORKER_SECRET_HEADER = "x-queue-worker-secret";

export function requireQueueWorker(request: Request): Response | undefined {
  const expectedSecret = process.env.QUEUE_WORKER_SECRET;
  const providedSecret = request.headers.get(QUEUE_WORKER_SECRET_HEADER);

  if (!expectedSecret || !providedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expected = Buffer.from(expectedSecret);
  const provided = Buffer.from(providedSecret);

  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
