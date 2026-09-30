import { afterEach, expect, test, vi } from "vitest";

const { requireAdmin, getEventAttendance, toAttendanceCsv } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getEventAttendance: vi.fn(),
  toAttendanceCsv: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/services/attendance-service", () => ({ getEventAttendance, toAttendanceCsv }));

import { GET } from "@/app/api/events/[id]/attendance/export/route";

afterEach(() => vi.resetAllMocks());

test("does not query attendance when the export request is unauthorized", async () => {
  const unauthorized = Response.json({ error: "Unauthorized" }, { status: 401 });
  requireAdmin.mockResolvedValue(unauthorized);

  await expect(GET(new Request("https://sic.test"), { params: Promise.resolve({ id: "event-id" }) })).resolves.toBe(unauthorized);
  expect(getEventAttendance).not.toHaveBeenCalled();
});

test("exports the event's complete attendance roster as a CSV attachment", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  getEventAttendance.mockResolvedValue({
    name: "October Meeting",
    rosterEntries: [
      {
        status: "ATTENDED",
        arrivedAt: new Date("2026-10-01T10:00:00.000Z"),
        attendee: { name: "Ada", displayEmail: "ada@example.test", studentId: "SIC-001" },
      },
    ],
  });
  toAttendanceCsv.mockReturnValue("name,email\r\nAda,ada@example.test");

  const response = await GET(new Request("https://sic.test"), { params: Promise.resolve({ id: "event-id" }) });

  expect(getEventAttendance).toHaveBeenCalledWith("event-id");
  expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
  expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="October Meeting-attendance.csv"');
  await expect(response.text()).resolves.toBe("name,email\r\nAda,ada@example.test");
});
