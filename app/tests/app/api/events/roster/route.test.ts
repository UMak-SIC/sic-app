import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const addAttendeesToEvent = vi.hoisted(() => vi.fn());
const RosterError = vi.hoisted(() => class RosterError extends Error {});

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: () => requireAdmin() }));

vi.mock("@/lib/services/roster-service", () => ({
  addAttendeesToEvent: (input: unknown) => addAttendeesToEvent(input),
  RosterError,
  isUuid: (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
}));

import { POST } from "@/app/api/events/[id]/roster/route";

const EVENT_ID = "9fdcd48a-170a-4af7-862e-a511ad9d7b94";
const STUDENT = "11111111-1111-4111-8111-111111111111";

function post(body?: unknown) {
  return new Request(`http://localhost/api/events/${EVENT_ID}/roster`, {
    method: "POST",
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
}

function call(body?: unknown) {
  return POST(post(body), { params: Promise.resolve({ id: EVENT_ID }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ adminId: "admin-1" });
  addAttendeesToEvent.mockResolvedValue({
    added: 1,
    alreadyOnRoster: 0,
    unknownCount: 0,
    unknownStudentIds: [],
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/events/[id]/roster", () => {
  it("refuses a caller with no session", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

    expect((await call({ attendeeIds: [STUDENT] })).status).toBe(401);
    expect(addAttendeesToEvent).not.toHaveBeenCalled();
  });

  it("refuses a signed-in user who is not an administrator", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Forbidden" }, { status: 403 }));

    expect((await call({ attendeeIds: [STUDENT] })).status).toBe(403);
    expect(addAttendeesToEvent).not.toHaveBeenCalled();
  });

  it("adds the students and reports what happened", async () => {
    const res = await call({ attendeeIds: [STUDENT] });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      added: 1,
      alreadyOnRoster: 0,
      unknownCount: 0,
      unknownStudentIds: [],
    });
    expect(addAttendeesToEvent).toHaveBeenCalledWith({
      eventId: EVENT_ID,
      attendeeIds: [STUDENT],
    });
  });

  it("rejects a missing or empty list", async () => {
    for (const attendeeIds of [undefined, [], "nope", 5]) {
      expect((await call({ attendeeIds })).status, String(attendeeIds)).toBe(400);
    }

    expect(addAttendeesToEvent).not.toHaveBeenCalled();
  });

  it("rejects a list containing something that is not an id", async () => {
    const res = await call({ attendeeIds: [STUDENT, "not-an-id"] });

    expect(res.status).toBe(400);
    expect(addAttendeesToEvent).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    expect((await call("{not json")).status).toBe(400);
    expect(addAttendeesToEvent).not.toHaveBeenCalled();
  });

  it("passes a service refusal through as a 400 with its message", async () => {
    addAttendeesToEvent.mockRejectedValue(new RosterError("That event has closed."));

    const res = await call({ attendeeIds: [STUDENT] });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("That event has closed.");
  });

  it("does not swallow an unexpected failure", async () => {
    addAttendeesToEvent.mockRejectedValue(new Error("connection lost"));

    // A 400 here would tell the operator the event is closed, which is a lie.
    await expect(call({ attendeeIds: [STUDENT] })).rejects.toThrow("connection lost");
  });
});
