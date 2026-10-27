import { afterEach, expect, test, vi } from "vitest";

const { requireAdmin, updateAttendanceRecord } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  updateAttendanceRecord: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/services/checkin-service", () => ({ updateAttendanceRecord }));

import { PATCH } from "@/app/api/events/[id]/people/status/[rosterEntryId]/route";

afterEach(() => vi.resetAllMocks());

const routeContext = () => ({
  params: Promise.resolve({ id: "event-id", rosterEntryId: "entry-id" }),
});

test("does not edit the record when the request is unauthorized", async () => {
  const unauthorized = Response.json({ error: "Unauthorized" }, { status: 401 });
  requireAdmin.mockResolvedValue(unauthorized);

  const request = new Request("https://sic.test", {
    method: "PATCH",
    body: JSON.stringify({ status: "ATTENDED", arrivedAt: "2026-10-01T10:00:00.000Z" }),
  });

  await expect(PATCH(request, routeContext())).resolves.toBe(unauthorized);
  expect(updateAttendanceRecord).not.toHaveBeenCalled();
});

test("saves a corrected attendance record for one person", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  updateAttendanceRecord.mockResolvedValue({
    status: "ATTENDED",
    arrivedAt: new Date("2026-10-01T10:00:00.000Z"),
  });

  const request = new Request("https://sic.test", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ATTENDED", arrivedAt: "2026-10-01T10:00:00.000Z" }),
  });

  const response = await PATCH(request, routeContext());

  expect(updateAttendanceRecord).toHaveBeenCalledWith({
    eventId: "event-id",
    rosterEntryId: "entry-id",
    status: "ATTENDED",
    arrivedAt: new Date("2026-10-01T10:00:00.000Z"),
    updatedByAdminId: "admin-id",
  });
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    entry: { id: "entry-id", attendanceStatus: "ATTENDED", attendedAt: "2026-10-01T10:00:00.000Z" },
  });
});

test("answers a missing person with a 404", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  updateAttendanceRecord.mockResolvedValue(null);

  const request = new Request("https://sic.test", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ABSENT" }),
  });

  const response = await PATCH(request, routeContext());

  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: "Person not found for this event." });
});

test("saves still answer with a message when the database rejects them", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  updateAttendanceRecord.mockRejectedValue(new Error("record_lock_corrupt"));

  const request = new Request("https://sic.test", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ATTENDED" }),
  });

  const response = await PATCH(request, routeContext());

  expect(response.status).toBe(500);
  await expect(response.json()).resolves.toEqual({
    error: "This record could not be saved right now. Try again.",
  });
});

test("rejects record values other than attended, absent, or not recorded", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });

  const request = new Request("https://sic.test", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "CHECKED_IN" }),
  });

  const response = await PATCH(request, routeContext());

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "Choose a valid attendance record: attended, late, absent, or not recorded.",
  });
  expect(updateAttendanceRecord).not.toHaveBeenCalled();
});

test("rejects an arrival time in the future", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });

  const request = new Request("https://sic.test", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ATTENDED", arrivedAt: "2999-01-01T00:00:00.000Z" }),
  });

  const response = await PATCH(request, routeContext());

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: "Arrival time cannot be in the future." });
  expect(updateAttendanceRecord).not.toHaveBeenCalled();
});
