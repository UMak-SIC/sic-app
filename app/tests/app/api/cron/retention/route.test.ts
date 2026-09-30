import { afterEach, expect, test, vi } from "vitest";

const { runRetention } = vi.hoisted(() => ({ runRetention: vi.fn() }));

vi.mock("@/lib/services/retention-service", () => ({ runRetention }));

import { POST } from "@/app/api/cron/retention/route";

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

test("rejects missing or invalid retention cron secrets before starting cleanup", async () => {
  vi.stubEnv("RETENTION_CRON_SECRET", "retention-secret");

  const missingSecret = await POST(
    new Request("http://localhost/api/cron/retention", { method: "POST" }),
  );
  const invalidSecret = await POST(
    new Request("http://localhost/api/cron/retention", {
      method: "POST",
      headers: { "X-Retention-Cron-Secret": "retention-secrex" },
    }),
  );

  expect(missingSecret.status).toBe(401);
  expect(invalidSecret.status).toBe(401);
  expect(runRetention).not.toHaveBeenCalled();
});

test("runs retention with the dedicated cron secret", async () => {
  vi.stubEnv("RETENTION_CRON_SECRET", "retention-secret");
  runRetention.mockResolvedValue({
    anonymizedAttendees: 1,
    cutoff: new Date("2025-01-01T00:00:00.000Z"),
    deletedAttendees: 2,
    deletedDeliveries: 3,
    deletedRosterEntries: 4,
  });

  const response = await POST(
    new Request("http://localhost/api/cron/retention", {
      method: "POST",
      headers: { "X-Retention-Cron-Secret": "retention-secret" },
    }),
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    anonymizedAttendees: 1,
    cutoff: "2025-01-01T00:00:00.000Z",
    deletedAttendees: 2,
    deletedDeliveries: 3,
    deletedRosterEntries: 4,
  });
  expect(runRetention).toHaveBeenCalledOnce();
});
