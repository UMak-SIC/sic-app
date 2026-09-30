import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { getNeonAuth, middleware } = vi.hoisted(() => ({
  getNeonAuth: vi.fn(),
  middleware: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ getNeonAuth }));

// Next.js matcher patterns use path-to-regexp syntax where ":path*" means zero
// or more segments. This mirrors that closely enough to assert which routes the
// proxy guards without pulling in Next's internal matcher.
function matches(pattern: string, path: string): boolean {
  const source = pattern
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith(":")) {
        return segment.endsWith("*") ? "(?:/[^/]+)*" : "/[^/]+";
      }
      return `/${segment}`;
    })
    .join("");

  return new RegExp(`^${source}$`).test(path);
}

beforeEach(() => {
  getNeonAuth.mockReturnValue({ middleware });
  middleware.mockReturnValue(vi.fn());
});

afterEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
});

test("delegates to the Neon Auth middleware with the sign-in route", async () => {
  getNeonAuth.mockReturnValue({ middleware });
  middleware.mockReturnValue(vi.fn());

  const { default: proxy, config } = await import("@/proxy");

  expect(typeof proxy).toBe("function");
  expect(config.matcher).toEqual(["/checkin/:path*", "/events/:path*"]);

  // The auth client is resolved per request rather than at module scope, so
  // importing this module must not touch the auth environment.
  expect(getNeonAuth).not.toHaveBeenCalled();

  await proxy({} as never);

  expect(getNeonAuth).toHaveBeenCalledTimes(1);
  expect(middleware).toHaveBeenCalledWith({ loginUrl: "/auth/sign-in" });
});

test("protects the check-in and event administration pages", async () => {
  const { config } = await import("@/proxy");

  for (const path of [
    "/checkin",
    "/checkin/some-event",
    "/events",
    "/events/9fdcd48a-170a-4af7-862e-a511ad9d7b94",
    "/events/9fdcd48a-170a-4af7-862e-a511ad9d7b94/attendance",
  ]) {
    expect(
      config.matcher.some((pattern) => matches(pattern, path)),
      `expected ${path} to be protected`
    ).toBe(true);
  }
});

test("leaves the auth handler, API routes, and static assets reachable", async () => {
  const { config } = await import("@/proxy");

  for (const path of [
    "/",
    "/api/auth/sign-in/email",
    "/api/auth/get-session",
    "/api/internal/queue-jobs",
    "/api/events/9fdcd48a-170a-4af7-862e-a511ad9d7b94/attendance/export",
    "/_next/static/chunk.js",
    "/_next/image",
    "/favicon.ico",
  ]) {
    expect(
      config.matcher.some((pattern) => matches(pattern, path)),
      `expected ${path} to be reachable`
    ).toBe(false);
  }
});
