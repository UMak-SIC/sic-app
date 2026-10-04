import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, requireAdmin } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@prisma/client", () => ({ DeliveryStatus: { SENT: "SENT" } }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => ({ event: { findUnique } }) }));

import { GET } from "@/app/api/events/[id]/people/status/route";

const EVENT_ID = "9fdcd48a-170a-4af7-862e-a511ad9d7b94";

function call() {
  return GET(new Request(`http://localhost/api/events/${EVENT_ID}/people/status`), {
    params: Promise.resolve({ id: EVENT_ID }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ adminId: "admin-1" });
});

afterEach(() => vi.resetAllMocks());

describe("GET /api/events/[id]/people/status", () => {
  it("refuses a caller without an administrator session", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

    expect((await call()).status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns each invited person with ticket and attendance status", async () => {
    findUnique.mockResolvedValue({
      rosterEntries: [{
        id: "entry-1",
        status: "ATTENDED",
        arrivedAt: new Date("2026-10-01T08:15:00.000Z"),
        attendee: { id: "attendee-1", name: "Andrea Santos", studentId: "2023-00182", displayEmail: "andrea@umak.edu.ph" },
        deliveries: [{ sentAt: new Date("2026-10-01T07:00:00.000Z") }],
      }],
    });

    const response = await call();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      people: [{
        id: "entry-1",
        name: "Andrea Santos",
        studentId: "2023-00182",
        email: "andrea@umak.edu.ph",
        attendanceStatus: "ATTENDED",
        attendedAt: "2026-10-01T08:15:00.000Z",
        ticketSentAt: "2026-10-01T07:00:00.000Z",
      }],
    });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: EVENT_ID },
      select: expect.objectContaining({ rosterEntries: expect.objectContaining({
        select: expect.objectContaining({
          deliveries: expect.objectContaining({ where: { status: "SENT" } }),
        }),
      }) }),
    }));
  });

  it("returns a not-found response for an unknown event", async () => {
    findUnique.mockResolvedValue(null);

    expect((await call()).status).toBe(404);
  });
});
