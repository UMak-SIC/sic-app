import { describe, expect, test, vi } from "vitest";

import { downloadLogo, LogoMigrationError, parseStorageOrigin } from "@/scripts/import-supabase-qr-data.mjs";
import { parseQrExport } from "@/scripts/lib/qr-export.mjs";

const linkId = "4a5c4b1e-8a3e-4f43-9a51-1f5f2f0a6b10";

function exportText(overrides: { links?: unknown[]; visits?: unknown[]; format?: string } = {}) {
  return JSON.stringify({
    format: overrides.format ?? "sic-qr-export/v1",
    exportedAt: "2026-10-15T00:00:00.000000Z",
    links: overrides.links ?? [
      {
        id: linkId,
        code: "AbCdEfG",
        name: "Orientation",
        destination: "https://example.test/orientation?ref=qr",
        viewCount: "2",
        status: "active",
        expiresAt: null,
        qrForeground: "#176b4f",
        qrBackground: "#f9f9ee",
        qrLogoUrl: null,
        createdAt: "2026-09-02T01:02:03.123456Z",
        updatedAt: "2026-09-03T01:02:03.123456Z",
      },
    ],
    visits: overrides.visits ?? [
      { linkId, visitedAt: "2026-09-04T00:00:00.000001Z" },
      { linkId, visitedAt: "2026-09-04T00:00:00.000001Z" },
    ],
  });
}

function link(overrides: Record<string, unknown>) {
  return { ...JSON.parse(exportText()).links[0], ...overrides };
}

describe("parseQrExport", () => {
  test("accepts a well-formed export and keeps timestamps and counts as text", () => {
    const parsed = parseQrExport(exportText());

    expect(parsed.links[0]).toMatchObject({ viewCount: "2", createdAt: "2026-09-02T01:02:03.123456Z" });
    expect(parsed.visits).toHaveLength(2);
  });

  test("rejects files that are not a QR export", () => {
    expect(() => parseQrExport("not json")).toThrow("not valid JSON");
    expect(() => parseQrExport(exportText({ format: "other" }))).toThrow("not a sic-qr-export/v1 export");
  });

  test("collects every invalid field before anything is written", () => {
    const run = () =>
      parseQrExport(
        exportText({
          links: [
            link({ destination: "http://example.test", qrForeground: "green", status: "deleted" }),
            link({ id: "4a5c4b1e-8a3e-4f43-9a51-1f5f2f0a6b11", code: "AbCdEf" }),
          ],
          visits: [{ linkId: "4a5c4b1e-8a3e-4f43-9a51-1f5f2f0a6b99", visitedAt: "2026-09-04T00:00:00Z" }],
        }),
      );

    expect(run).toThrow(/destination that is not an absolute HTTPS address/);
    expect(run).toThrow(/invalid foreground color/);
    expect(run).toThrow(/unknown status/);
    expect(run).toThrow(/invalid code/);
    expect(run).toThrow(/visits\[0\] does not belong to an exported link/);
  });

  test("rejects duplicate ids and codes", () => {
    const run = () => parseQrExport(exportText({ links: [link({}), link({})], visits: [] }));

    expect(run).toThrow(`Link id ${linkId} appears more than once.`);
    expect(run).toThrow("Code AbCdEfG appears more than once.");
  });
});

describe("downloadLogo", () => {
  const origin = "https://project.supabase.co";
  const logoAddress = `${origin}/storage/v1/object/public/qr-logos/owner/logo.png`;

  function imageResponse(body: Uint8Array<ArrayBuffer>, headers: Record<string, string> = {}) {
    return new Response(body, { headers: { "content-type": "image/png", ...headers } });
  }

  test("downloads a public logo from the Supabase storage origin without following redirects", async () => {
    const fetchImpl = vi.fn(async () => imageResponse(new Uint8Array([1, 2, 3])));

    await expect(downloadLogo(logoAddress, origin, fetchImpl)).resolves.toEqual({
      bytes: new Uint8Array([1, 2, 3]),
      mediaType: "image/png",
    });
    expect(fetchImpl).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: "error" }));
  });

  test.each([
    ["not a url", "not a valid URL"],
    ["http://project.supabase.co/storage/v1/object/public/qr-logos/logo.png", "not HTTPS"],
    ["https://evil.test/storage/v1/object/public/qr-logos/logo.png", "not a public file"],
    ["https://other.supabase.co/storage/v1/object/public/qr-logos/logo.png", "not a public file"],
    ["https://project.supabase.co.evil.test/storage/v1/object/public/qr-logos/logo.png", "not a public file"],
    ["https://project.supabase.co@evil.test/storage/v1/object/public/qr-logos/logo.png", "not a public file"],
    ["https://user:pass@project.supabase.co/storage/v1/object/public/qr-logos/logo.png", "not a public file"],
    ["https://project.supabase.co:8443/storage/v1/object/public/qr-logos/logo.png", "not a public file"],
    ["https://project.supabase.co/logo.png", "not a public file"],
    ["https://project.supabase.co/storage/v1/object/sign/qr-logos/logo.png", "not a public file"],
    ["https://project.supabase.co/storage/v1/object/public/../../../auth/v1/user", "not a public file"],
  ])("rejects %s without a request", async (address, message) => {
    const fetchImpl = vi.fn();

    const attempt = downloadLogo(address, origin, fetchImpl);
    await expect(attempt).rejects.toBeInstanceOf(LogoMigrationError);
    await expect(attempt).rejects.toThrow(message);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("rejects a response that was redirected to another host", async () => {
    const redirected = imageResponse(new Uint8Array([1]));
    Object.defineProperty(redirected, "redirected", { value: true });
    Object.defineProperty(redirected, "url", { value: "https://evil.test/logo.png" });
    const fetchImpl = vi.fn(async () => redirected);

    await expect(downloadLogo(logoAddress, origin, fetchImpl)).rejects.toThrow("redirected");
  });

  test("reports a redirect refused by fetch as a migration failure", async () => {
    const fetchImpl = vi.fn(async () => Promise.reject(new TypeError("fetch failed", { cause: "unexpected redirect" })));

    await expect(downloadLogo(logoAddress, origin, fetchImpl)).rejects.toBeInstanceOf(LogoMigrationError);
  });

  test("reports unreachable, missing, non-image, and oversized logos as migration failures", async () => {
    const oversized = new Uint8Array(10 * 1024 * 1024 + 1);
    const cases: Array<[() => Promise<Response>, string]> = [
      [async () => Promise.reject(new TypeError("fetch failed")), "could not be downloaded"],
      [async () => new Response("missing", { status: 404 }), "HTTP 404"],
      [async () => new Response("<html>", { headers: { "content-type": "text/html" } }), "did not return an image"],
      [async () => imageResponse(new Uint8Array(1), { "content-length": String(oversized.byteLength) }), "upload limit"],
      [async () => imageResponse(oversized), "upload limit"],
    ];

    for (const [fetchImpl, message] of cases) {
      const attempt = downloadLogo(logoAddress, origin, fetchImpl);
      await expect(attempt).rejects.toBeInstanceOf(LogoMigrationError);
      await expect(attempt).rejects.toThrow(message);
    }
  });
});

describe("parseStorageOrigin", () => {
  test("accepts a bare HTTPS origin", () => {
    expect(parseStorageOrigin("https://project.supabase.co")).toBe("https://project.supabase.co");
    expect(parseStorageOrigin("https://project.supabase.co/")).toBe("https://project.supabase.co");
  });

  test.each([
    "",
    "project.supabase.co",
    "http://project.supabase.co",
    "https://project.supabase.co/storage/v1",
    "https://user@project.supabase.co",
    "https://project.supabase.co?x=1",
  ])("rejects %j", (value) => {
    expect(() => parseStorageOrigin(value)).toThrow("SUPABASE_STORAGE_ORIGIN");
  });
});
