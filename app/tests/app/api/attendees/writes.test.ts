import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const createAttendee = vi.hoisted(() => vi.fn());
const updateAttendee = vi.hoisted(() => vi.fn());
const softDeleteAttendee = vi.hoisted(() => vi.fn());
const AttendeeWriteError = vi.hoisted(() =>
  class AttendeeWriteError extends Error {
    constructor(
      message: string,
      readonly kind: "not_found" | "conflict" = "conflict"
    ) {
      super(message);
    }
  }
);

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: () => requireAdmin() }));

vi.mock("@/lib/services/attendee-service", () => ({
  createAttendee: (input: unknown) => createAttendee(input),
  updateAttendee: (input: unknown) => updateAttendee(input),
  softDeleteAttendee: (input: unknown) => softDeleteAttendee(input),
  AttendeeWriteError,
}));

import { POST } from "@/app/api/attendees/route";
import { DELETE, PATCH } from "@/app/api/attendees/[id]/route";

const ID = "11111111-1111-4111-8111-111111111111";

function request(method: string, body?: unknown, id = ID) {
  return new Request(`http://localhost/api/attendees${id === ID ? "" : `/${id}`}`, {
    method,
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
}

function callPost(body?: unknown) {
  return POST(request("POST", body));
}

function callPatch(body?: unknown, id = ID) {
  return PATCH(request("PATCH", body, id), { params: Promise.resolve({ id }) });
}

function callDelete(id = ID) {
  return DELETE(request("DELETE", undefined, id), { params: Promise.resolve({ id }) });
}

const goodStudent = {
  name: "Andrea Santos",
  studentId: "2023-00182",
  email: "andrea.santos@umak.edu.ph",
  course: "BSCS",
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ adminId: "admin-1" });
  createAttendee.mockResolvedValue({ id: ID, restored: false });
  updateAttendee.mockResolvedValue({ id: ID });
  softDeleteAttendee.mockResolvedValue({ id: ID });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/attendees", () => {
  it("refuses a caller with no session", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

    expect((await callPost(goodStudent)).status).toBe(401);
    expect(createAttendee).not.toHaveBeenCalled();
  });

  it("adds a student and says it created one", async () => {
    const res = await callPost(goodStudent);

    // 201 because a record was made, which is different from bringing one back.
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: ID, restored: false });
  });

  it("answers 200 when the student had been removed and is now back", async () => {
    createAttendee.mockResolvedValue({ id: ID, restored: true });

    const res = await callPost(goodStudent);

    // No record was created, so 201 would be a lie.
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: ID, restored: true });
  });

  it("names the field that is wrong", async () => {
    const res = await callPost({ ...goodStudent, email: "not-an-address" });

    expect(res.status).toBe(400);
    // The field travels with the message so the dialog can put it on the right input
    // rather than in a banner at the top.
    expect(await res.json()).toMatchObject({ field: "email" });
    expect(createAttendee).not.toHaveBeenCalled();
  });

  it("requires a name, a student number and an email", async () => {
    for (const missing of ["name", "studentId", "email"]) {
      const body: Record<string, unknown> = { ...goodStudent };
      delete body[missing];

      const res = await callPost(body);
      expect(res.status, missing).toBe(400);
      expect((await res.json()).field, missing).toBe(missing);
    }
  });

  it("treats a blank course as no course rather than a mistake", async () => {
    const res = await callPost({ ...goodStudent, course: "   " });

    // The column is nullable, so an empty one means "not recorded" and not an error.
    expect(res.status).toBe(201);
    expect(createAttendee.mock.calls[0][0].course).toBeNull();
  });

  it("keeps a course nobody has an allow-list for", async () => {
    await callPost({ ...goodStudent, course: "BS Information Technology" });

    // Coercing an unrecognised course to a default would invent one nobody wrote.
    expect(createAttendee.mock.calls[0][0].course).toBe("BS Information Technology");
  });

  it("answers 409 when the student is already in the directory", async () => {
    createAttendee.mockRejectedValue(new AttendeeWriteError("Already in the directory."));

    const res = await callPost(goodStudent);

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Already in the directory.");
  });

  it("rejects a body that is not JSON", async () => {
    expect((await callPost("{not json")).status).toBe(400);
  });
});

describe("PATCH /api/attendees/[id]", () => {
  it("refuses a caller who is not an administrator", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Forbidden" }, { status: 403 }));

    expect((await callPatch({ name: "New Name" })).status).toBe(403);
    expect(updateAttendee).not.toHaveBeenCalled();
  });

  it("edits the student", async () => {
    const res = await callPatch({ course: "BSIT" });

    expect(res.status).toBe(200);
    expect(updateAttendee).toHaveBeenCalledWith({ id: ID, changes: { course: "BSIT" } });
  });

  it("sends only the details that were in the request", async () => {
    await callPatch({ section: "BSIT-2A" });

    // Not the whole record: everything else would be overwritten with what the
    // browser happened to be holding.
    expect(updateAttendee.mock.calls[0][0].changes).toEqual({ section: "BSIT-2A" });
  });

  it("clears an optional detail that was set to nothing", async () => {
    await callPatch({ course: null });

    expect(updateAttendee.mock.calls[0][0].changes).toEqual({ course: null });
  });

  it("refuses an id that is not one", async () => {
    expect((await callPatch({ name: "X" }, "not-a-uuid")).status).toBe(400);
    expect(updateAttendee).not.toHaveBeenCalled();
  });

  it("refuses a request that changes nothing", async () => {
    expect((await callPatch({})).status).toBe(400);
    expect(updateAttendee).not.toHaveBeenCalled();
  });

  it("will not blank a required detail", async () => {
    const res = await callPatch({ name: null });

    // The column is NOT NULL, so this is a mistake rather than a request to clear it.
    expect(res.status).toBe(400);
    expect(updateAttendee).not.toHaveBeenCalled();
  });

  it("answers 404 for a student who is not in the directory", async () => {
    updateAttendee.mockRejectedValue(
      new AttendeeWriteError("That student is no longer in the directory.", "not_found")
    );

    const res = await callPatch({ name: "X" });

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("That student is no longer in the directory.");
  });

  it("answers 409 when the change would take somebody else's identity", async () => {
    updateAttendee.mockRejectedValue(
      new AttendeeWriteError("Another student already uses that student number.", "conflict")
    );

    const res = await callPatch({ studentId: "2023-99999" });

    // Not a 404: the record is there, the change is not allowed. Answering "no such
    // student" would send the operator looking for the wrong problem.
    expect(res.status).toBe(409);
  });

  it("does not swallow an unexpected failure", async () => {
    updateAttendee.mockRejectedValue(new Error("connection lost"));

    await expect(callPatch({ name: "X" })).rejects.toThrow("connection lost");
  });
});

describe("DELETE /api/attendees/[id]", () => {
  it("refuses a caller with no session", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

    const res = await callDelete();

    expect(res.status).toBe(401);
    expect(softDeleteAttendee).not.toHaveBeenCalled();
  });

  it("removes the student", async () => {
    const res = await callDelete();

    expect(res.status).toBe(200);
    expect(softDeleteAttendee).toHaveBeenCalledWith({ id: ID });
  });

  it("refuses an id that is not one", async () => {
    const res = await callDelete("nope");

    expect(res.status).toBe(400);
    expect(softDeleteAttendee).not.toHaveBeenCalled();
  });

  it("answers 404 for a student who was already removed", async () => {
    softDeleteAttendee.mockRejectedValue(
      new AttendeeWriteError("That student has already been removed.", "not_found")
    );

    const res = await callDelete();

    expect(res.status).toBe(404);
  });
});
