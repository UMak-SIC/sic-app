import { afterEach, expect, test, vi } from "vitest";

const { publishEvent, requireAdmin } = vi.hoisted(() => ({ publishEvent: vi.fn(), requireAdmin: vi.fn() }));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/services/event-service", () => ({
  publishEvent,
  EventLifecycleError: class EventLifecycleError extends Error {},
}));

import { POST } from "@/app/api/events/[id]/publish/route";

afterEach(() => vi.resetAllMocks());

test("publishes a draft after administrator authorization", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });

  const response = await POST(new Request("https://sic.test"), { params: Promise.resolve({ id: "event-id" }) });

  expect(publishEvent).toHaveBeenCalledWith("event-id");
  await expect(response.json()).resolves.toEqual({ ok: true });
});
