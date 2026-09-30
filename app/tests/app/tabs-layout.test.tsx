import { isValidElement, type ReactElement } from "react";
import { beforeEach, expect, test, vi } from "vitest";

// The layout is the only place authorization is enforced for pages, so the test
// covers the three outcomes of requireAdmin(): an admin renders the shell, a
// 403 lands on the denial page, and a 401 lands on sign-in. The proxy only
// covers the first half of that decision, so nothing else exercises it.

const { requireAdmin, redirect, appShell, connection } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  redirect: vi.fn(),
  appShell: vi.fn(),
  connection: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("next/navigation", () => ({ redirect }));
// connection() throws outside a request scope, which is exactly the situation a
// unit test is in. Mocked so the test exercises the auth branch rather than the
// prerender guard.
vi.mock("next/server", () => ({ connection }));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: appShell,
}));

// Next's redirect() signals by throwing, so the mock has to as well or the
// layout would fall through and render the shell it was trying to refuse.
beforeEach(() => {
  vi.resetAllMocks();
  connection.mockResolvedValue(undefined);
  redirect.mockImplementation((target: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT:${target}`), { target });
  });
  appShell.mockImplementation((props: { children: unknown }) => props.children);
});

async function renderLayout() {
  const { default: DashboardLayout } = await import("@/app/(tabs)/layout");

  return DashboardLayout({ children: "page-content" } as never);
}

test("stops prerendering before touching auth", async () => {
  // The regression guard. Without connection(), Next prerenders these pages at
  // build time, calls requireAdmin() with no request in scope, and the deploy
  // host has no NEON_AUTH_BASE_URL, so the build dies on "NEON_AUTH_BASE_URL is
  // required to initialize Neon Auth". Locally the same call returns a 401 and
  // redirects, which Next tolerates, so only CI sees it. Asserting the ordering
  // is the only way a unit test can catch it.
  requireAdmin.mockResolvedValue({ adminId: "admintypicalid" });

  await renderLayout();

  expect(connection).toHaveBeenCalledTimes(1);
  expect(connection.mock.invocationCallOrder[0]).toBeLessThan(
    requireAdmin.mock.invocationCallOrder[0]
  );
});

test("renders the admin shell for an allowlisted admin", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admintypicalid" });

  const result = await renderLayout();

  expect(redirect).not.toHaveBeenCalled();
  // The layout returns an unrendered element rather than rendered output, so
  // both the shell and the page content are asserted through that element.
  expect(isValidElement(result)).toBe(true);
  expect((result as ReactElement<{ children: unknown }>).type).toBe(appShell);
  expect((result as ReactElement<{ children: unknown }>).props.children).toBe(
    "page-content"
  );
});

test("sends a signed-in non-admin to the access-denied page", async () => {
  requireAdmin.mockResolvedValue(Response.json({ error: "Forbidden" }, { status: 403 }));

  await expect(renderLayout()).rejects.toThrow("NEXT_REDIRECT:/unauthorized");

  expect(redirect).toHaveBeenCalledWith("/unauthorized");
  // US-02 requires no admin navigation on the denial screen, which is why the
  // shell must not render on this path.
  expect(appShell).not.toHaveBeenCalled();
});

test("sends a sessionless visitor to sign in", async () => {
  requireAdmin.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

  await expect(renderLayout()).rejects.toThrow("NEXT_REDIRECT:/login");

  expect(redirect).toHaveBeenCalledWith("/login");
  expect(appShell).not.toHaveBeenCalled();
});
