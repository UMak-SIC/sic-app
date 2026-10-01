import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const getCourseParticipation = vi.hoisted(() => vi.fn());
const getOrganizationTimezone = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/services/attendee-insights-service", () => ({
  getCourseParticipation: () => getCourseParticipation(),
}));
vi.mock("@/lib/events/organization-timezone", () => ({
  getOrganizationTimezone: () => getOrganizationTimezone(),
}));

import { GET } from "@/app/api/attendees/insights/route";

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ adminId: "admin-1" });
  getOrganizationTimezone.mockReturnValue("Asia/Manila");
  getCourseParticipation.mockResolvedValue({
    courses: [{ course: "BSIT", students: 5, rosterEntries: 15, attendedCheckIns: 9, attendanceRate: 60 }],
    totals: { courseCount: 1, students: 5, rosterEntries: 15, attendedCheckIns: 9, attendanceRate: 60 },
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/attendees/insights", () => {
  it("refuses a caller with no session", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

    const res = await GET();

    expect(res.status).toBe(401);
    // The figures are the whole registry's, so they must not be computed for a caller
    // who is going to be refused.
    expect(getCourseParticipation).not.toHaveBeenCalled();
  });

  it("refuses a signed-in user who is not an administrator", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Forbidden" }, { status: 403 }));

    expect((await GET()).status).toBe(403);
    expect(getCourseParticipation).not.toHaveBeenCalled();
  });

  it("returns the courses and the totals", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.courses).toHaveLength(1);
    expect(body.totals.students).toBe(5);
  });

  it("returns an empty result rather than a failure when there is nobody", async () => {
    getCourseParticipation.mockResolvedValue({
      courses: [],
      totals: { courseCount: 0, students: 0, rosterEntries: 0, attendedCheckIns: 0, attendanceRate: 0 },
    });

    const res = await GET();

    // An empty directory is a state the card has to draw, not an error.
    expect(res.status).toBe(200);
    expect((await res.json()).courses).toEqual([]);
  });

  it("carries the timezone so the card formats like the table above it", async () => {
    expect((await (await GET()).json()).timezone).toBe("Asia/Manila");
  });

  it("does not swallow an unexpected failure", async () => {
    getCourseParticipation.mockRejectedValue(new Error("connection lost"));

    await expect(GET()).rejects.toThrow("connection lost");
  });
});