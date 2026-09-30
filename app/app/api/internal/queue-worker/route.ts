import { requireQueueWorker } from "@/lib/auth/require-queue-worker";
import { createDeliveryMessageResolver } from "@/lib/queue/delivery-message";
import { processQueueJobs } from "@/lib/queue/process-jobs";
import { selectProviderForJob } from "@/lib/queue/provider-selector";
import { createProviderDispatch } from "@/lib/queue/providers";

export const runtime = "nodejs";

/**
 * Drains the delivery queue (TSK-0706 and TSK-0707 completion).
 *
 * `/api/internal/queue-jobs` only *enqueues*; nothing called
 * `processQueueJobs`, so a queued campaign delivery sat there forever. This is
 * the endpoint that claims a batch, resolves each delivery into a real message,
 * dispatches it through a provider, and records the attempt.
 *
 * Auth is `requireQueueWorker`, the same shared-secret check the enqueue route
 * uses, because this is called by a scheduler or a platform cron rather than by
 * a browser.
 *
 * `limit` is clamped to the same 1..100 range `claimQueueJobs` enforces, so a
 * caller cannot ask for an unbounded batch and hold the delivery table's locks
 * for a long time.
 */
export async function POST(request: Request): Promise<Response> {
  const unauthorized = requireQueueWorker(request);
  if (unauthorized) {
    return unauthorized;
  }

  // An absent body means "drain the default batch", which is what a bare cron
  // invocation sends. A body that is present but unparseable is a caller bug and
  // is reported, rather than silently becoming the default. `request.json()`
  // cannot tell those two apart, so the text is read directly.
  const raw = await request.text().catch(() => "");

  let limit = 10;
  let workerId = "queue-worker";

  if (raw.trim().length > 0) {
    let payload: { limit?: unknown; workerId?: unknown };

    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    if (payload.limit !== undefined) {
      if (
        typeof payload.limit !== "number" ||
        !Number.isInteger(payload.limit) ||
        payload.limit < 1 ||
        payload.limit > 100
      ) {
        return Response.json(
          { error: "limit must be an integer between 1 and 100." },
          { status: 400 }
        );
      }

      limit = payload.limit;
    }

    // Distinguishes one worker's locks from another's in queue_jobs.locked_by,
    // which is what makes a stuck job diagnosable.
    if (payload.workerId !== undefined) {
      if (typeof payload.workerId !== "string" || !payload.workerId.trim()) {
        return Response.json(
          { error: "workerId must be a non-empty string." },
          { status: 400 }
        );
      }

      workerId = payload.workerId.trim();
    }
  }

  const result = await processQueueJobs({
    workerId,
    limit,
    selectProvider: selectProviderForJob,
    dispatch: createProviderDispatch({ resolveMessage: createDeliveryMessageResolver() }),
  });

  return Response.json(result, { status: 200 });
}
