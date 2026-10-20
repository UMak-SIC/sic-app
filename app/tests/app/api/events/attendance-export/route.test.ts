import { afterEach, expect, test, vi } from "vitest";

const { requireAdmin, exportEventParticipants } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  exportEventParticipants: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/services/participant-export-service", () => ({ exportEventParticipants }));

import { GET } from "@/app/api/events/[id]/attendance/export/route";

afterEach(() => vi.resetAllMocks());

test("does not query attendance when the export request is unauthorized", async () => {
  const unauthorized = Response.json({ error: "Unauthorized" }, { status: 401 });
  requireAdmin.mockResolvedValue(unauthorized);

  await expect(GET(new Request("https://sic.test"), { params: Promise.resolve({ id: "event-id" }) })).resolves.toBe(unauthorized);
  expect(exportEventParticipants).not.toHaveBeenCalled();
});

test("exports the event's complete attendance roster as a CSV attachment", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  exportEventParticipants.mockResolvedValue({ events: [{
    name: "October Meeting",
    rosterEntries: [
      {
        status: "ATTENDED",
        arrivedAt: new Date("2026-10-01T10:00:00.000Z"),
        attendee: { name: "Ada", displayEmail: "ada@example.test", studentId: "SIC-001" },
      },
    ],
  }], csv: "name,email\r\nAda,ada@example.test" });

  const response = await GET(new Request("https://sic.test"), { params: Promise.resolve({ id: "event-id" }) });

  expect(exportEventParticipants).toHaveBeenCalledWith("event-id");
  expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
  expect(response.headers.get("Content-Disposition")).toContain('filename="October Meeting-participants.csv"');
  await expect(response.text()).resolves.toBe("name,email\r\nAda,ada@example.test");
});
