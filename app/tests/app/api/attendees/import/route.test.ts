import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { applyAttendeeImport, requireAdmin, buildImportPreview, filterPreviewToRows } =
  vi.hoisted(() => ({
    applyAttendeeImport: vi.fn(),
    requireAdmin: vi.fn(),
    buildImportPreview: vi.fn(),
    filterPreviewToRows: vi.fn(),
  }));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: () => requireAdmin(),
}));

vi.mock("@/lib/services/attendee-service", () => ({
  applyAttendeeImport: (preview: unknown) => applyAttendeeImport(preview),
}));

vi.mock("@/lib/services/ingestion/import-request", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/services/ingestion/import-request")>();
  return { ...actual, buildImportPreview, filterPreviewToRows };
});

import { POST as previewPost } from "@/app/api/attendees/import/preview/route";
import { POST as commitPost } from "@/app/api/attendees/import/commit/route";

function post(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const source = { ok: true as const, mode: "csv" as const, content: "name,email" };

describe("POST /api/attendees/import/preview", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("refuses an unauthenticated caller", async () => {
    requireAdmin.mockResolvedValue(
      Response.json({ error: "Unauthorized" }, { status: 401 })
    );

    const res = await previewPost(post("/api/attendees/import/preview", { mode: "csv" }));

    expect(res.status).toBe(401);
    expect(buildImportPreview).not.toHaveBeenCalled();
  });

  it("reports the summary and the approvable rows without writing", async () => {
    requireAdmin.mockResolvedValue({ adminId: "admin-1" });
    buildImportPreview.mockResolvedValue({
      parse: { records: [{ row: 2 }], errors: [{ row: 5, field: "format", message: "bad" }] },
      preview: { newAttendees: [{ row: 2 }], updates: [{ record: { row: 3 } }], conflicts: [] },
      withheld: [],
    });

    const res = await previewPost(
      post("/api/attendees/import/preview", { mode: "csv", content: "name,email" })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toMatchObject({ parsed: 1, malformed: 1, newCount: 1, updateCount: 1 });
    expect(body.errors).toHaveLength(1);
    expect(body.approvableRows).toEqual([2, 3]);
    // A report, not an authorization: nothing is written on this route.
    expect(applyAttendeeImport).not.toHaveBeenCalled();
  });

  it("rejects a body that is not a recognisable list", async () => {
    requireAdmin.mockResolvedValue({ adminId: "admin-1" });

    const res = await previewPost(post("/api/attendees/import/preview", { content: "a@b.com" }));

    expect(res.status).toBe(400);
  });

  it("rejects a body that is not JSON", async () => {
    requireAdmin.mockResolvedValue({ adminId: "admin-1" });

    const res = await previewPost(post("/api/attendees/import/preview", "not json"));

    expect(res.status).toBe(400);
  });
});

describe("POST /api/attendees/import/commit", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("refuses an unauthenticated caller", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Forbidden" }, { status: 403 }));

    const res = await commitPost(
      post("/api/attendees/import/commit", { mode: "csv", content: "x", approvedRows: [1] })
    );

    expect(res.status).toBe(403);
    expect(applyAttendeeImport).not.toHaveBeenCalled();
  });

  it("rebuilds the preview server-side instead of trusting the browser", async () => {
    requireAdmin.mockResolvedValue({ adminId: "admin-1" });
    buildImportPreview.mockResolvedValue({
      parse: { records: [], errors: [] },
      preview: { newAttendees: [{ row: 1 }, { row: 2 }], updates: [], conflicts: [] },
      withheld: [],
    });
    filterPreviewToRows.mockReturnValue({
      newAttendees: [{ row: 2 }],
      updates: [],
      conflicts: [],
    });
    applyAttendeeImport.mockResolvedValue({ createdIds: ["a1"], updatedIds: [], unapplied: [] });

    const res = await commitPost(
      post("/api/attendees/import/commit", {
        mode: "csv",
        content: "name,email",
        approvedRows: [2],
        // A caller trying to smuggle in its own preview.
        preview: { newAttendees: [{ row: 9, attendeeId: "someone-else" }] },
      })
    );

    expect(res.status).toBe(200);
    expect(buildImportPreview).toHaveBeenCalledWith(source);
    // Only the server-derived, row-filtered preview reaches the transaction.
    expect(filterPreviewToRows).toHaveBeenCalledWith(
      expect.objectContaining({ newAttendees: [{ row: 1 }, { row: 2 }] }),
      [2]
    );
    expect(applyAttendeeImport).toHaveBeenCalledWith({
      newAttendees: [{ row: 2 }],
      updates: [],
      conflicts: [],
    });
  });

  it("refuses when the browser never said which rows it approved", async () => {
    requireAdmin.mockResolvedValue({ adminId: "admin-1" });

    const res = await commitPost(
      post("/api/attendees/import/commit", { mode: "csv", content: "name,email" })
    );

    expect(res.status).toBe(400);
    expect(applyAttendeeImport).not.toHaveBeenCalled();
  });

  it("refuses when the approved rows select nothing importable", async () => {
    requireAdmin.mockResolvedValue({ adminId: "admin-1" });
    buildImportPreview.mockResolvedValue({
      parse: { records: [], errors: [] },
      preview: { newAttendees: [], updates: [], conflicts: [] },
      withheld: [],
    });
    filterPreviewToRows.mockReturnValue({ newAttendees: [], updates: [], conflicts: [] });

    const res = await commitPost(
      post("/api/attendees/import/commit", {
        mode: "csv",
        content: "name,email",
        approvedRows: [7],
      })
    );

    expect(res.status).toBe(400);
    expect(applyAttendeeImport).not.toHaveBeenCalled();
  });

  it("returns the counts the administrator needs to confirm what happened", async () => {
    requireAdmin.mockResolvedValue({ adminId: "admin-1" });
    buildImportPreview.mockResolvedValue({
      parse: { records: [], errors: [] },
      preview: { newAttendees: [{ row: 1 }], updates: [], conflicts: [] },
      withheld: [{ row: 4, reason: "paste_cannot_create", message: "Upload a spreadsheet." }],
    });
    filterPreviewToRows.mockReturnValue({
      newAttendees: [{ row: 1 }],
      updates: [],
      conflicts: [],
    });
    applyAttendeeImport.mockResolvedValue({
      createdIds: ["a1"],
      updatedIds: ["a2"],
      unapplied: [{ record: { row: 3 }, reason: "conflict", message: "needs a decision" }],
    });

    const res = await commitPost(
      post("/api/attendees/import/commit", {
        mode: "paste",
        content: "a@b.com",
        approvedRows: [1],
      })
    );

    const body = await res.json();
    expect(body).toMatchObject({ created: 1, updated: 1, skipped: 1 });
    expect(body.withheld[0].message).toBe("Upload a spreadsheet.");
  });
});
