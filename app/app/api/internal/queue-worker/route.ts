import { requireQueueWorker } from "@/lib/auth/require-queue-worker";
import { createDeliveryMessageResolver } from "@/lib/queue/delivery-message";
import { processQueueJobs } from "@/lib/queue/process-jobs";
import { selectProviderForJob } from "@/lib/queue/provider-selector";
import { createProviderDispatch } from "@/lib/queue/providers";
import {
  confirmProviderSend,
  hasProviderCapacity,
  releaseProviderReservation,
} from "@/lib/queue/quota-manager";
import type { EmailProvider } from "@prisma/client";
import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";
import type { DeliveryAttemptResult } from "@/lib/queue/delivery-logger";

export const runtime = "nodejs";

/**
 * Drains the delivery queue (TSK-0705, TSK-0706 and TSK-0707 completion).
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

/**
 * Wraps the adapter dispatch so the selector's quota reservation is settled.
 *
 * A send that succeeded keeps its slot, because the provider really did use it.
 * A send that failed gives it back, so a day of provider errors cannot burn the
 * allowance and strand the jobs behind it. A throw — from the resolver or from
 * the adapter — releases the slot too, and is re-thrown so the queue records the
 * attempt as a failure.
 */
function withQuotaReconciliation(
  dispatch: (
    job: ClaimedQueueJob,
    provider: EmailProvider,
  ) => Promise<Omit<DeliveryAttemptResult, "provider">>
): (
  job: ClaimedQueueJob,
  provider: EmailProvider,
) => Promise<Omit<DeliveryAttemptResult, "provider">> {
  return async (job, provider) => {
    try {
      const attempt = await dispatch(job, provider);

      if (attempt.succeeded) {
        await confirmProviderSend({ provider });
      } else {
        await releaseProviderReservation({ provider });
      }

      return attempt;
    } catch (error) {
      await releaseProviderReservation({ provider });
      throw error;
    }
  };
}

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

  // US-23: when both daily quotas are spent, unsent work stays in the queue. Check
  // before claiming so an exhausted day costs one indexed read rather than a batch
  // of locks. The per-job reservation in the selector is still the authority —
  // capacity can be consumed between this read and the claim.
  if (!(await hasProviderCapacity())) {
    return Response.json(
      {
        claimed: 0,
        completed: 0,
        retried: 0,
        deadLettered: 0,
        held: 0,
        reason: "Both providers have used their daily allowance. Work stays queued.",
      },
      { status: 200 }
    );
  }

  const result = await processQueueJobs({
    workerId,
    limit,
    selectProvider: selectProviderForJob,
    dispatch: withQuotaReconciliation(
      createProviderDispatch({ resolveMessage: createDeliveryMessageResolver() })
    ),
  });

  return Response.json(result, { status: 200 });
}
