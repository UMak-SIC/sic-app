import { afterEach, expect, test } from "vitest";

import { requireQueueWorker } from "@/lib/auth/require-queue-worker";

const originalSecret = process.env.QUEUE_WORKER_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.QUEUE_WORKER_SECRET;
  } else {
    process.env.QUEUE_WORKER_SECRET = originalSecret;
  }
});

test("authorizes a request with the configured queue-worker secret", () => {
  process.env.QUEUE_WORKER_SECRET = "queue-worker-secret";

  expect(
    requireQueueWorker(
      new Request("http://localhost", {
        headers: { "X-Queue-Worker-Secret": "queue-worker-secret" },
      }),
    ),
  ).toBeUndefined();
});

test("rejects a missing or incorrect queue-worker secret", async () => {
  process.env.QUEUE_WORKER_SECRET = "queue-worker-secret";

  const missingSecret = requireQueueWorker(new Request("http://localhost"));
  const incorrectSecret = requireQueueWorker(
    new Request("http://localhost", {
      headers: { "X-Queue-Worker-Secret": "incorrect-secret" },
    }),
  );

  expect(missingSecret?.status).toBe(401);
  await expect(missingSecret?.json()).resolves.toEqual({ error: "Unauthorized" });
  expect(incorrectSecret?.status).toBe(401);
  await expect(incorrectSecret?.json()).resolves.toEqual({ error: "Unauthorized" });
});
