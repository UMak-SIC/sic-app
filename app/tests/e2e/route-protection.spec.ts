import { expect, test, type APIResponse } from "@playwright/test";

// Asserted through a real request stack rather than only in the unit test,
// because the matcher config and the Neon Auth middleware both have to agree at
// runtime. A unit test on `config.matcher` passes even when the proxy is never
// loaded, which is exactly the failure a misplaced `proxy.ts` produces.

const SIGN_IN = "/login";

// `APIResponse.headers()` comes back empty for a redirect, so read the header
// array instead. The Location value is relative under `next dev` and absolute
// under `next start`, so it is resolved against the base URL rather than parsed
// on its own.
async function redirectedTo(response: APIResponse, baseURL: string): Promise<URL> {
  const headers = await response.headersArray();
  const location = headers.find((header) => header.name.toLowerCase() === "location")?.value;

  expect(location, "redirect response should carry a Location header").toBeTruthy();

  return new URL(location as string, baseURL);
}

test("answers a protected page with a redirect to the sign-in route", async ({
  request,
  baseURL,
}) => {
  const response = await request.get("/checkin", { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect((await redirectedTo(response, baseURL as string)).pathname).toBe(SIGN_IN);
});

test("guards event attendance the same way", async ({ request, baseURL }) => {
  const response = await request.get(
    "/events/9fdcd48a-170a-4af7-862e-a511ad9d7b94/attendance",
    { maxRedirects: 0 },
  );

  expect(response.status()).toBe(307);
  expect((await redirectedTo(response, baseURL as string)).pathname).toBe(SIGN_IN);
});

test("forwards the original query string to the sign-in route", async ({
  request,
  baseURL,
}) => {
  const response = await request.get("/checkin?event=123", { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect((await redirectedTo(response, baseURL as string)).search).toBe("?event=123");
});

test("puts the root URL behind sign-in, since it redirects to the overview", async ({
  request,
  baseURL,
}) => {
  // app/app/page.tsx redirects "/" to /overview, so leaving the root reachable
  // only moved the login wall one hop away. This app is an internal tool, so the
  // whole surface sits behind sign-in.
  const response = await request.get("/", { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect((await redirectedTo(response, baseURL as string)).pathname).toBe(
    SIGN_IN
  );
});

test("guards the admin screens added after the original matcher", async ({
  request,
  baseURL,
}) => {
  // These answered 200 with no session while the matcher was an allowlist of
  // /checkin and /events, because the frontend merge added them without
  // touching the proxy. Each is about to start showing real data, so this is
  // the guard for that exposure.
  for (const path of [
    "/attendees",
    "/assets",
    "/campaign",
    "/campaign/new",
    "/overview",
    "/settings",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });

    expect(response.status(), `${path} should redirect`).toBe(307);
    expect((await redirectedTo(response, baseURL as string)).pathname).toBe(
      SIGN_IN
    );
  }
});

test("keeps the sign-in screen reachable so a bounced visitor can sign in", async ({
  request,
}) => {
  const response = await request.get(SIGN_IN);

  expect(response.status()).toBe(200);
});

test("lands a browser on a sign-in page that renders", async ({ page }) => {
  // The redirect target has to be a route that exists. The proxy used to send
  // unauthenticated visitors to /auth/sign-in, which is not a route, so this
  // asserted the URL of a 404 and looked like it passed. Asserting the form
  // itself is what catches that class of bug.
  const response = await page.goto("/checkin", { waitUntil: "commit" });

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(SIGN_IN));
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
});
