import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { requireAdmin, exportEvents, exportParticipants, exportEventParticipants } = vi.hoisted(() => ({
  requireAdmin: vi.fn(), exportEvents: vi.fn(), exportParticipants: vi.fn(), exportEventParticipants: vi.fn(),
}));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/services/participant-export-service", () => ({ exportEvents, exportParticipants, exportEventParticipants }));
import { POST as events } from "@/app/api/events/export/route";
import { POST as people } from "@/app/api/attendees/export/route";
import { GET as attendance } from "@/app/api/events/[id]/attendance/export/route";

const id = "9fdcd48a-170a-4af7-862e-a511ad9d7b94";
const request = (body: unknown) => new Request("https://sic.test/api/export", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => requireAdmin.mockResolvedValue({ adminId: "admin-1" }));
afterEach(() => vi.resetAllMocks());

test.each([events, people])("requires an administrator session before reading export data", async (route) => {
  requireAdmin.mockResolvedValue(new Response(null, { status: 401 }));
  expect((await route(request({ ids: [id] }))).status).toBe(401);
  expect(exportEvents).not.toHaveBeenCalled();
  expect(exportParticipants).not.toHaveBeenCalled();
});

test.each([null, {}, { ids: [] }, { ids: ["invalid"] }, { ids: [123] }])("rejects invalid export selections: %j", async (body) => {
  expect((await events(request(body))).status).toBe(400);
  expect((await people(request(body))).status).toBe(400);
  expect(exportEvents).not.toHaveBeenCalled();
  expect(exportParticipants).not.toHaveBeenCalled();
});

test("exports exactly the requested events and deduplicates selections", async () => {
  exportEvents.mockResolvedValue({ csv: "event csv" });
  const response = await events(request({ ids: [id, id] }));
  expect(exportEvents).toHaveBeenCalledWith([id]);
  expect(await response.text()).toBe("event csv");
  expect(response.headers.get("Content-Disposition")).toContain("umak-sic-events.csv");
});

test("exports exactly the requested directory students and their history", async () => {
  exportParticipants.mockResolvedValue("participant csv");
  const response = await people(request({ ids: [id] }));
  expect(exportParticipants).toHaveBeenCalledWith([id]);
  expect(await response.text()).toBe("participant csv");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

test("unknown event attendance exports return 404", async () => {
  exportEventParticipants.mockResolvedValue({ events: [], csv: "headers" });
  const response = await attendance(new Request("https://sic.test"), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(404);
});
