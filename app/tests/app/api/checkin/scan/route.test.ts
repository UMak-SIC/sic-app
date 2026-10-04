import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const recordCheckIn = vi.fn();
const requireAdmin = vi.fn();

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: () => requireAdmin(),
}));

vi.mock("@/lib/services/checkin-service", () => ({
  recordCheckIn: (params: unknown) => recordCheckIn(params),
}));

import { POST } from "@/app/api/checkin/scan/route";

describe("POST /api/checkin/scan", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if unauthenticated", async () => {
    requireAdmin.mockResolvedValue(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }));

    const req = new NextRequest("http://localhost/api/checkin/scan", {
      method: "POST",
      body: JSON.stringify({ eventId: "evt-1", ticketTokenOrCode: "SIC-123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 if required fields are missing", async () => {
    requireAdmin.mockResolvedValue({ adminId: "admin-1" });

    const req = new NextRequest("http://localhost/api/checkin/scan", {
      method: "POST",
      body: JSON.stringify({ eventId: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("calls recordCheckIn and returns 200 on success", async () => {
    requireAdmin.mockResolvedValue({ adminId: "admin-1" });
    recordCheckIn.mockResolvedValue({
      status: "success",
      message: "Andrea Santos checked in.",
      attendee: { name: "Andrea Santos", studentId: "2023-00182", email: "andrea.santos@umak.edu.ph" },
    });

    const req = new NextRequest("http://localhost/api/checkin/scan", {
      method: "POST",
      body: JSON.stringify({
        eventId: "11111111-1111-1111-1111-111111111111",
        ticketTokenOrCode: "SIC-9F2K-7QRM",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("success");
    expect(json.attendee.name).toBe("Andrea Santos");
    expect(recordCheckIn).toHaveBeenCalledWith({
      eventId: "11111111-1111-1111-1111-111111111111",
      ticketTokenOrCode: "SIC-9F2K-7QRM",
      adminId: "admin-1",
    });
  });

  it("returns a bad request response for unreadable JSON", async () => {
    requireAdmin.mockResolvedValue({ adminId: "admin-1" });

    const req = new NextRequest("http://localhost/api/checkin/scan", {
      method: "POST",
      body: "not JSON",
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "We could not read that check-in. Please scan the ticket again.",
    });
  });
});
