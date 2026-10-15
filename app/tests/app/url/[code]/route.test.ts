import { afterEach, expect, test, vi } from "vitest";

const { resolveShortUrl } = vi.hoisted(() => ({ resolveShortUrl: vi.fn() }));

vi.mock("@/lib/services/short-url-service", () => ({ resolveShortUrl }));

import { GET, HEAD, dynamic } from "@/app/url/[code]/route";

const context = (code: string) => ({ params: Promise.resolve({ code }) });

afterEach(() => vi.resetAllMocks());

test("forces request-time execution because resolving records a scan", () => {
  expect(dynamic).toBe("force-dynamic");
});

test("redirects an active short code without exposing link metadata", async () => {
  resolveShortUrl.mockResolvedValue("https://example.com/handbook");

  const response = await GET(
    new Request("https://umak-sic.vercel.app/url/AbCdEfG"),
    context("AbCdEfG"),
  );

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("https://example.com/handbook");
  expect(resolveShortUrl).toHaveBeenCalledWith("AbCdEfG");
  expect(await response.text()).toBe("");
});

test("returns 404 when the code is inactive, expired, or missing", async () => {
  resolveShortUrl.mockResolvedValue(null);

  const response = await GET(
    new Request("https://umak-sic.vercel.app/url/AbCdEfG"),
    context("AbCdEfG"),
  );

  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: "Link not found." });
});

test("rejects malformed codes before touching persistence", async () => {
  const response = await GET(
    new Request("https://umak-sic.vercel.app/url/abc1234"),
    context("abc1234"),
  );

  expect(response.status).toBe(404);
  expect(resolveShortUrl).not.toHaveBeenCalled();
});

test("HEAD records the scan and returns the same empty 302 redirect", async () => {
  resolveShortUrl.mockResolvedValue("https://example.com/handbook");

  const response = await HEAD(
    new Request("https://umak-sic.vercel.app/url/AbCdEfG", { method: "HEAD" }),
    context("AbCdEfG"),
  );

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("https://example.com/handbook");
  expect(response.body).toBeNull();
  expect(resolveShortUrl).toHaveBeenCalledOnce();
});
