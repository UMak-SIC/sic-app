import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailProvider } from "@prisma/client";

const requireQueueWorker = vi.hoisted(() => vi.fn());
const processQueueJobs = vi.hoisted(() => vi.fn());
const selectProviderForJob = vi.hoisted(() => vi.fn());
const createProviderDispatch = vi.hoisted(() => vi.fn());
const createDeliveryMessageResolver = vi.hoisted(() => vi.fn());
const hasProviderCapacity = vi.hoisted(() => vi.fn());
const confirmProviderSend = vi.hoisted(() => vi.fn());
const releaseProviderReservation = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/require-queue-worker", () => ({
  requireQueueWorker: (request: Request) => requireQueueWorker(request),
}));

vi.mock("@/lib/queue/process-jobs", () => ({
  processQueueJobs: (input: unknown) => processQueueJobs(input),
}));

vi.mock("@/lib/queue/provider-selector", () => ({
  selectProviderForJob: (job: unknown) => selectProviderForJob(job),
}));

vi.mock("@/lib/queue/providers", () => ({
  createProviderDispatch: (deps: unknown) => createProviderDispatch(deps),
}));

vi.mock("@/lib/queue/delivery-message", () => ({
  createDeliveryMessageResolver: () => createDeliveryMessageResolver(),
}));

vi.mock("@/lib/queue/quota-manager", () => ({
  hasProviderCapacity: () => hasProviderCapacity(),
  confirmProviderSend: (input: unknown) => confirmProviderSend(input),
  releaseProviderReservation: (input: unknown) => releaseProviderReservation(input),
}));

import { POST } from "@/app/api/internal/queue-worker/route";

/** The adapter dispatch the route wraps; each test controls its outcome. */
const adapterDispatch = vi.fn();

function post(body?: string) {
  return new Request("http://localhost/api/internal/queue-worker", {
    method: "POST",
    ...(body === undefined ? {} : { body }),
  });
}

/** The dispatch the route actually handed to the queue. */
function wrappedDispatch() {
  return processQueueJobs.mock.calls[0][0].dispatch;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireQueueWorker.mockReturnValue(undefined);
  hasProviderCapacity.mockResolvedValue(true);
  processQueueJobs.mockResolvedValue({
    claimed: 2,
    completed: 2,
    retried: 0,
    deadLettered: 0,
    held: 0,
  });
  adapterDispatch.mockResolvedValue({ succeeded: true, httpStatus: 202 });
  createProviderDispatch.mockReturnValue(adapterDispatch);
  createDeliveryMessageResolver.mockReturnValue(vi.fn());
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/internal/queue-worker", () => {
  it("refuses a caller without the worker secret", async () => {
    requireQueueWorker.mockReturnValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

    const res = await POST(post());

    expect(res.status).toBe(401);
    // The point of the check: nothing is claimed or dispatched.
    expect(processQueueJobs).not.toHaveBeenCalled();
    expect(hasProviderCapacity).not.toHaveBeenCalled();
  });

  it("drains a default batch when no body is sent", async () => {
    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ claimed: 2, completed: 2, held: 0 });
    expect(processQueueJobs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, workerId: "queue-worker" })
    );
  });

  it("passes the provider selector and a dispatch built from the resolver", async () => {
    await POST(post());

    const input = processQueueJobs.mock.calls[0][0];

    // The module mock exports a wrapper, so identity is checked by delegation
    // rather than by reference: the selector the queue receives must reach the
    // real implementation.
    expect(typeof input.selectProvider).toBe("function");
    await input.selectProvider({ id: "job-1" });
    expect(selectProviderForJob).toHaveBeenCalledWith({ id: "job-1" });

    expect(createDeliveryMessageResolver).toHaveBeenCalledTimes(1);
    expect(createProviderDispatch).toHaveBeenCalledWith({
      resolveMessage: expect.any(Function),
    });
  });

  it("honours a limit and workerId", async () => {
    await POST(post(JSON.stringify({ limit: 5, workerId: "cron-a" })));

    expect(processQueueJobs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, workerId: "cron-a" })
    );
  });

  it("rejects a limit outside the range claimQueueJobs allows", async () => {
    for (const limit of [0, 101, 2.5, "5"]) {
      const res = await POST(post(JSON.stringify({ limit })));

      expect(res.status, `limit ${String(limit)} should be rejected`).toBe(400);
    }

    expect(processQueueJobs).not.toHaveBeenCalled();
  });

  it("rejects an empty workerId", async () => {
    const res = await POST(post(JSON.stringify({ workerId: "   " })));

    expect(res.status).toBe(400);
    expect(processQueueJobs).not.toHaveBeenCalled();
  });

  it("reports a body that is present but unparseable", async () => {
    // Distinct from an absent body, which means "drain the default batch".
    const res = await POST(post("{not json"));

    expect(res.status).toBe(400);
    expect(processQueueJobs).not.toHaveBeenCalled();
  });

  it("surfaces the counts the queue reports", async () => {
    processQueueJobs.mockResolvedValue({
      claimed: 5,
      completed: 3,
      retried: 1,
      deadLettered: 0,
      held: 1,
    });

    const res = await POST(post());

    expect(await res.json()).toEqual({
      claimed: 5,
      completed: 3,
      retried: 1,
      deadLettered: 0,
      held: 1,
    });
  });

  describe("when both daily quotas are exhausted", () => {
    beforeEach(() => {
      hasProviderCapacity.mockResolvedValue(false);
    });

    it("claims nothing and says why", async () => {
      const res = await POST(post());

      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ claimed: 0, held: 0 });
      // US-23: unsent work stays in the queue. Claiming a batch here would lock
      // deliveries the worker cannot send.
      expect(processQueueJobs).not.toHaveBeenCalled();
    });
  });

  describe("settling the quota reservation", () => {
    it("keeps the slot and counts the send when it succeeded", async () => {
      await POST(post());

       await wrappedDispatch()({ id: "job-1" }, EmailProvider.BREVO);

      // The provider really did use the slot, so it is not given back — doing so
      // would hand out the same daily allowance repeatedly.
       expect(confirmProviderSend).toHaveBeenCalledWith({ provider: EmailProvider.BREVO });
      expect(releaseProviderReservation).not.toHaveBeenCalled();
    });

    it("returns the slot when the provider rejected the send", async () => {
      await POST(post());
      adapterDispatch.mockResolvedValue({ succeeded: false, httpStatus: 503 });

       const attempt = await wrappedDispatch()({ id: "job-1" }, EmailProvider.BREVO);

      expect(attempt).toMatchObject({ succeeded: false, httpStatus: 503 });
       expect(releaseProviderReservation).toHaveBeenCalledWith({ provider: EmailProvider.BREVO });
      expect(confirmProviderSend).not.toHaveBeenCalled();
    });

    it("returns the slot and re-throws when dispatch throws", async () => {
      await POST(post());
       adapterDispatch.mockRejectedValue(new Error("Brevo request failed"));

      await expect(
        wrappedDispatch()({ id: "job-1" }, EmailProvider.BREVO)
       ).rejects.toThrow("Brevo request failed");

      // Otherwise a provider outage would permanently consume the day's quota.
      expect(releaseProviderReservation).toHaveBeenCalledWith({ provider: EmailProvider.BREVO });
    });

    it("passes the adapter's result through unchanged", async () => {
      await POST(post());
      adapterDispatch.mockResolvedValue({
        succeeded: true,
        httpStatus: 200,
        providerMessageId: "abc",
      });

       await expect(wrappedDispatch()({ id: "job-1" }, EmailProvider.BREVO)).resolves.toEqual({
        succeeded: true,
        httpStatus: 200,
        providerMessageId: "abc",
      });
    });
  });
});
