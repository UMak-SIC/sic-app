import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { getNeonAuth, middleware } = vi.hoisted(() => ({
  getNeonAuth: vi.fn(),
  middleware: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ getNeonAuth }));

// Next.js matcher patterns use path-to-regexp syntax. The proxy uses two
// shapes: a named-parameter pattern such as "/checkin/:path*", and a negative
// lookahead such as "/((?!login|api).*)". Both are translated here rather than
// pulling in Next's internal matcher, so the assertions stay about which paths
// the guard covers.
function matches(pattern: string, path: string): boolean {
  if (pattern.startsWith("/((?!")) {
    // A negative lookahead guards everything it does not exclude, so the
    // pattern is already a valid regular expression body.
    return new RegExp(`^${pattern}$`).test(path);
  }

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
  expect(config.matcher).toHaveLength(1);

  // The auth client is resolved per request rather than at module scope, so
  // importing this module must not touch the auth environment.
  expect(getNeonAuth).not.toHaveBeenCalled();

  await proxy({} as never);

  expect(getNeonAuth).toHaveBeenCalledTimes(1);
  expect(middleware).toHaveBeenCalledWith({ loginUrl: "/login" });
});

test("guards every administration page, not just check-in and events", async () => {
  const { config } = await import("@/proxy");

  for (const path of [
    // The two the original allowlist covered.
    "/checkin",
    "/checkin/some-event",
    "/events",
    "/events/9fdcd48a-170a-4af7-862e-a511ad9d7b94",
    "/events/9fdcd48a-170a-4af7-862e-a511ad9d7b94/attendance",
    // Added by the frontend merge. These answered 200 with no session while the
    // matcher was an allowlist, so this test is the regression guard for it.
    "/attendees",
    "/assets",
    "/campaign",
    "/campaign/new",
    "/campaign/9fdcd48a-170a-4af7-862e-a511ad9d7b94",
    "/overview",
    "/settings",
    // The root redirects to /overview, so guarding it is what puts the whole app
    // behind sign-in rather than only the admin screens.
    "/",
  ]) {
    expect(
      config.matcher.some((pattern) => matches(pattern, path)),
      `expected ${path} to be protected`
    ).toBe(true);
  }
});

test("leaves the sign-in screens, API routes, and static assets reachable", async () => {
  const { config } = await import("@/proxy");

  for (const path of [
    // A bounced visitor has to be able to sign in.
    "/login",
    "/register",
    // API routes answer JSON 401/403 from their own requireAdmin() calls and
    // must not be turned into an HTML redirect.
    "/api/auth/sign-in/email",
    "/api/auth/get-session",
    "/api/checkin/scan",
    "/api/internal/queue-jobs",
    "/api/events/9fdcd48a-170a-4af7-862e-a511ad9d7b94/attendance/export",
    // Static assets still have to load on the sign-in screen itself.
    "/_next/static/chunk.js",
    "/_next/image",
    "/favicon.ico",
    // Files served out of public/. These were inside the guarded set, so the logo
    // and the sidebar mascot went through the auth middleware and came back as an
    // HTML page with a 200 — which next/image then reported as "not a valid
    // image, received null", reading like a corrupt file rather than a routing
    // mistake.
    "/sic_logo_nobg.png",
    "/cute-logo.svg",
    "/assets/sic_logo_nobg.png",
    "/window.svg",
  ]) {
    expect(
      config.matcher.some((pattern) => matches(pattern, path)),
      `expected ${path} to be reachable`
    ).toBe(false);
  }
});

test("excludes files by extension without opening a hole for page routes", async () => {
  const { config } = await import("@/proxy");

  // The exclusion is "a dot in the last path segment", so it has to stay narrower
  // than "any dot anywhere": a directory that happens to contain one must still
  // be guarded, or an admin page under a dotted folder would be left open.
  for (const path of [
    "/some.file/admin-page",
    "/v1.2/admin-page",
    "/events/9fdcd48a-170a-4af7-862e-a511ad9d7b94/attendance",
  ]) {
    expect(
      config.matcher.some((pattern) => matches(pattern, path)),
      `expected ${path} to be protected`
    ).toBe(true);
  }
});
