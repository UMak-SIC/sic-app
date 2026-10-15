import { afterEach, beforeEach, expect, test, vi } from "vitest";

const {
  createShortUrl,
  deleteShortUrl,
  listShortUrls,
  requireAdmin,
  setShortUrlStatus,
  updateShortUrl,
} = vi.hoisted(() => ({
  createShortUrl: vi.fn(),
  deleteShortUrl: vi.fn(),
  listShortUrls: vi.fn(),
  requireAdmin: vi.fn(),
  setShortUrlStatus: vi.fn(),
  updateShortUrl: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/services/short-url-service", () => ({
  createShortUrl,
  deleteShortUrl,
  listShortUrls,
  setShortUrlStatus,
  ShortUrlInputError: class ShortUrlInputError extends Error {},
  updateShortUrl,
}));

import { GET, POST } from "@/app/api/qr/links/route";
import { DELETE, PATCH } from "@/app/api/qr/links/[id]/route";
import { POST as setStatus } from "@/app/api/qr/links/[id]/status/route";
import { ShortUrlInputError } from "@/lib/services/short-url-service";

const link = {
  id: "9fdcd48a-170a-4af7-862e-a511ad9d7b94",
  code: "AbCdEfG",
  name: "SIC handbook",
  destination: "https://example.com/handbook",
  viewCount: 12,
  status: "ACTIVE",
  expiresAt: null,
  qrForeground: "#12333A",
  qrBackground: "#FFFFFF",
  qrLogoAssetId: null,
  qrLogoUrl: null,
  createdAt: "2026-10-15T08:00:00.000Z",
  updatedAt: "2026-10-15T08:30:00.000Z",
};

const context = { params: Promise.resolve({ id: link.id }) };

beforeEach(() => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  listShortUrls.mockResolvedValue([link]);
  createShortUrl.mockResolvedValue(link);
  updateShortUrl.mockResolvedValue(link);
  setShortUrlStatus.mockResolvedValue({ ...link, status: "DISABLED" });
  deleteShortUrl.mockResolvedValue(true);
});

afterEach(() => vi.resetAllMocks());

test("lists only the signed-in administrator's JSON-safe links", async () => {
  const response = await GET();

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ links: [link] });
  expect(listShortUrls).toHaveBeenCalledWith("admin-id");
});

test("creates a link without accepting an administrator or custom code from the browser", async () => {
  const response = await POST(
    new Request("https://sic.test/api/qr/links", {
      method: "POST",
      body: JSON.stringify({
        name: "SIC handbook",
        destination: link.destination,
        code: "ChosenX",
        adminId: "other-admin",
      }),
    }),
  );

  expect(response.status).toBe(201);
  expect(createShortUrl).toHaveBeenCalledWith(
    {
      name: "SIC handbook",
      destination: link.destination,
      expiresAt: null,
      qrForeground: undefined,
      qrBackground: undefined,
      qrLogoAssetId: null,
    },
    "admin-id",
  );
});

test("rejects invalid JSON with a plain operator-safe response", async () => {
  const response = await POST(
    new Request("https://sic.test/api/qr/links", { method: "POST", body: "{" }),
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: "Please check the link details." });
  expect(createShortUrl).not.toHaveBeenCalled();
});

test("returns service validation without exposing database details", async () => {
  createShortUrl.mockRejectedValueOnce(
    new ShortUrlInputError("Destination link must be a secure HTTPS address."),
  );

  const response = await POST(
    new Request("https://sic.test/api/qr/links", {
      method: "POST",
      body: JSON.stringify({ destination: "http://example.com" }),
    }),
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "Destination link must be a secure HTTPS address.",
  });
});

test("requires authentication before parsing a write", async () => {
  requireAdmin.mockResolvedValueOnce(Response.json({ error: "Unauthorized" }, { status: 401 }));

  const response = await POST(
    new Request("https://sic.test/api/qr/links", { method: "POST", body: "{" }),
  );

  expect(response.status).toBe(401);
  expect(createShortUrl).not.toHaveBeenCalled();
});

test("updates link settings for the signed-in owner", async () => {
  const response = await PATCH(
    new Request(`https://sic.test/api/qr/links/${link.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated", destination: "https://example.com/new" }),
    }),
    context,
  );

  expect(response.status).toBe(200);
  expect(updateShortUrl).toHaveBeenCalledWith(
    link.id,
    expect.objectContaining({ name: "Updated", destination: "https://example.com/new" }),
    "admin-id",
  );
});

test("does not reveal a link owned by another administrator", async () => {
  updateShortUrl.mockResolvedValueOnce(null);

  const response = await PATCH(
    new Request(`https://sic.test/api/qr/links/${link.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
    }),
    context,
  );

  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: "Link not found." });
});

test("pauses or resumes only the requested link", async () => {
  const response = await setStatus(
    new Request(`https://sic.test/api/qr/links/${link.id}/status`, {
      method: "POST",
      body: JSON.stringify({ status: "DISABLED" }),
    }),
    context,
  );

  expect(response.status).toBe(200);
  expect(setShortUrlStatus).toHaveBeenCalledWith(link.id, "DISABLED", "admin-id");
});

test("deletes only the signed-in administrator's link", async () => {
  const response = await DELETE(
    new Request(`https://sic.test/api/qr/links/${link.id}`, { method: "DELETE" }),
    context,
  );

  expect(response.status).toBe(204);
  expect(deleteShortUrl).toHaveBeenCalledWith(link.id, "admin-id");
});
