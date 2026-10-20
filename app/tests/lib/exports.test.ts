import { afterEach, expect, test, vi } from "vitest";
import { downloadExport } from "@/lib/exports";

afterEach(() => vi.unstubAllGlobals());

test("downloads the event attachment after the request succeeds", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("csv"));
  const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
  const createObjectURL = vi.fn().mockReturnValue("blob:export");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("document", { createElement: () => link, body: { appendChild: vi.fn() } });
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  await downloadExport("/api/events/event-1/attendance/export", "participants.csv");
  expect(fetch).toHaveBeenCalledWith("/api/events/event-1/attendance/export", undefined);
  expect(link.download).toBe("participants.csv");
  expect(link.click).toHaveBeenCalledOnce();
  expect(link.remove).toHaveBeenCalledOnce();
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:export");
});

test("posts selected IDs and reports session expiry without creating a fake download", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
  vi.stubGlobal("fetch", fetch);
  await expect(downloadExport("/api/events/export", "events.csv", ["event-1"]))
    .rejects.toThrow("Your session has ended.");
  expect(fetch).toHaveBeenCalledWith("/api/events/export", expect.objectContaining({
    method: "POST", body: JSON.stringify({ ids: ["event-1"] }),
  }));
});

test("does not expose server error details", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("internal failure", { status: 500 })));
  await expect(downloadExport("/api/events/export", "events.csv")).rejects.toThrow("The list could not be exported. Try again.");
});

test("network failures use plain language", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  await expect(downloadExport("/api/events/export", "events.csv")).rejects.toThrow("Check your connection and try again.");
});
