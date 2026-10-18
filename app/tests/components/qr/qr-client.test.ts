import { afterEach, expect, test, vi } from "vitest";

const { toDataURL } = vi.hoisted(() => ({ toDataURL: vi.fn() }));
vi.mock("qrcode", () => ({ default: { toDataURL } }));

import {
  createQrLink,
  generateQrPng,
  listQrLinks,
  shortUrlForCode,
} from "@/components/qr/qr-client";

const link = {
  id: "link-id",
  code: "AbCdEfG",
  name: "SIC handbook",
  destination: "https://example.com/handbook",
  viewCount: 12,
  status: "ACTIVE" as const,
  expiresAt: null,
  qrForeground: "#12333A",
  qrBackground: "#FFFFFF",
  qrLogoAssetId: null,
  qrLogoUrl: null,
  createdAt: "2026-10-15T08:00:00.000Z",
  updatedAt: "2026-10-15T08:30:00.000Z",
};

afterEach(() => {
  vi.restoreAllMocks();
  toDataURL.mockReset();
});

test("builds the public scan URL from the current deployed origin", () => {
  expect(shortUrlForCode("https://umak-sic.vercel.app", "AbCdEfG")).toBe(
    "https://umak-sic.vercel.app/url/AbCdEfG",
  );
});

test("generates a medium-correction QR when no logo is attached", async () => {
  toDataURL.mockResolvedValue("data:image/png;base64,qr");

  await expect(generateQrPng(link, "https://umak-sic.vercel.app")).resolves.toBe(
    "data:image/png;base64,qr",
  );
  expect(toDataURL).toHaveBeenCalledWith("https://umak-sic.vercel.app/url/AbCdEfG", {
    color: { dark: "#12333A", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
    margin: 2,
    width: 1024,
  });
});

test("falls back to a scannable logo-free QR when the center logo cannot load", async () => {
  toDataURL.mockResolvedValue("data:image/png;base64,qr");
  const onLogoError = vi.fn();
  vi.stubGlobal("document", { createElement: vi.fn(() => ({ getContext: vi.fn() })) });
  vi.stubGlobal("Image", class {
    crossOrigin = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(value: string) {
      if (value === "https://storage.example.com/logo.webp") this.onerror?.();
      else this.onload?.();
    }
  });

  await expect(
    generateQrPng(
      { ...link, qrLogoUrl: "https://storage.example.com/logo.webp" },
      "https://umak-sic.vercel.app",
      onLogoError,
    ),
  ).resolves.toBe("data:image/png;base64,qr");

  expect(onLogoError).toHaveBeenCalledOnce();
});

test("lists links from the authenticated API", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ links: [link] }), {
        headers: { "content-type": "application/json" },
      }),
    ),
  );

  await expect(listQrLinks()).resolves.toEqual([link]);
  expect(fetch).toHaveBeenCalledWith("/api/qr/links", expect.objectContaining({ cache: "no-store" }));
});

test("surfaces a plain API error when creation fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Destination link must use HTTPS." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    ),
  );

  await expect(createQrLink({ destination: "http://example.com" })).rejects.toThrow(
    "Destination link must use HTTPS.",
  );
});
