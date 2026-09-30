import { afterEach, expect, test, vi } from "vitest";

const { createEvent, listEvents, requireAdmin } = vi.hoisted(() => ({
  createEvent: vi.fn(),
  listEvents: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/events/organization-timezone", () => ({ getOrganizationTimezone: () => "Asia/Manila" }));
vi.mock("@/lib/services/event-service", () => ({
  createEvent,
  EventLifecycleError: class EventLifecycleError extends Error {},
  listEvents,
}));

import { GET, POST } from "@/app/api/events/route";

afterEach(() => vi.resetAllMocks());

test("lists persisted events for an administrator with the organization timezone", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  listEvents.mockResolvedValue([{ id: "event-id" }]);

  const response = await GET();

  expect(listEvents).toHaveBeenCalledOnce();
  await expect(response.json()).resolves.toEqual({ events: [{ id: "event-id" }], timezone: "Asia/Manila" });
});

test("creates an event through the lifecycle service for the signed-in administrator", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  createEvent.mockResolvedValue({ id: "event-id", status: "DRAFT" });

  const response = await POST(new Request("https://sic.test/api/events", {
    method: "POST",
    body: JSON.stringify({
      name: "General Assembly",
      details: "Annual meeting",
      startsAt: "2026-10-01T09:00:00.000Z",
      endsAt: "2026-10-01T10:00:00.000Z",
      imageAssetId: null,
    }),
  }));

  expect(createEvent).toHaveBeenCalledWith({
    name: "General Assembly",
    details: "Annual meeting",
    startsAt: new Date("2026-10-01T09:00:00.000Z"),
    endsAt: new Date("2026-10-01T10:00:00.000Z"),
    imageAssetId: null,
  }, "admin-id");
  expect(response.status).toBe(201);
});
