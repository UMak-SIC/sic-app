import { afterEach, expect, test, vi } from "vitest";

const { closeExpiredEvents } = vi.hoisted(() => ({ closeExpiredEvents: vi.fn() }));

vi.mock("@/lib/services/event-close-service", () => ({ closeExpiredEvents }));

import { POST } from "@/app/api/cron/close-events/route";

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

test("rejects missing and incorrect secrets before closure work", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");

  await expect(POST(new Request("http://localhost/api/cron/close-events"))).resolves.toMatchObject({
    status: 401,
  });
  await expect(
    POST(
      new Request("http://localhost/api/cron/close-events", {
        headers: { "X-Cron-Secret": "wrong-secret" },
      }),
    ),
  ).resolves.toMatchObject({ status: 401 });
  expect(closeExpiredEvents).not.toHaveBeenCalled();
});

test("returns the minimal closure result for a valid secret", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  closeExpiredEvents.mockResolvedValue({ closedEventCount: 2, absentEntryCount: 4 });

  const response = await POST(
    new Request("http://localhost/api/cron/close-events", {
      method: "POST",
      headers: { "X-Cron-Secret": "test-secret" },
    }),
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ closedEventCount: 2, absentEntryCount: 4 });
  expect(closeExpiredEvents).toHaveBeenCalledOnce();
});

test("allows repeated valid invocations while closure remains idempotent", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  closeExpiredEvents
    .mockResolvedValueOnce({ closedEventCount: 1, absentEntryCount: 2 })
    .mockResolvedValueOnce({ closedEventCount: 0, absentEntryCount: 0 });
  const request = () =>
    new Request("http://localhost/api/cron/close-events", {
      method: "POST",
      headers: { "X-Cron-Secret": "test-secret" },
    });

  await expect((await POST(request())).json()).resolves.toEqual({
    closedEventCount: 1,
    absentEntryCount: 2,
  });
  await expect((await POST(request())).json()).resolves.toEqual({
    closedEventCount: 0,
    absentEntryCount: 0,
  });
  expect(closeExpiredEvents).toHaveBeenCalledTimes(2);
});

test("returns a server error for missing cron configuration without closure work", async () => {
  vi.stubEnv("CRON_SECRET", "");

  await expect(POST(new Request("http://localhost/api/cron/close-events"))).resolves.toMatchObject({
    status: 500,
  });
  expect(closeExpiredEvents).not.toHaveBeenCalled();
});
