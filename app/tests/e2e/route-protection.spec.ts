import { expect, test } from "@playwright/test";

// Asserted through a real request stack rather than only in the unit test,
// because the matcher config and the Neon Auth middleware both have to agree at
// runtime. A unit test on `config.matcher` passes even when the proxy is never
// loaded, which is exactly the failure a misplaced `proxy.ts` produces.

const SIGN_IN = "/auth/sign-in";

test("answers a protected page with a redirect to the sign-in route", async ({ request }) => {
  const response = await request.get("/checkin", { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location).pathname).toBe(SIGN_IN);
});

test("guards event attendance the same way", async ({ request }) => {
  const response = await request.get(
    "/events/9fdcd48a-170a-4af7-862e-a511ad9d7b94/attendance",
    { maxRedirects: 0 },
  );

  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location).pathname).toBe(SIGN_IN);
});

test("forwards the original query string to the sign-in route", async ({ request }) => {
  const response = await request.get("/checkin?event=123", { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location).search).toBe("?event=123");
});

test("leaves the public home page reachable", async ({ request }) => {
  const response = await request.get("/");

  expect(response.status()).toBe(200);
});

test("lands a browser on the sign-in route", async ({ page }) => {
  // The sign-in page itself is the remaining half of TSK-0201 and does not exist
  // yet, so this lands on a 404 whose URL is the thing being asserted. Waiting
  // on `commit` keeps the assertion about the redirect rather than about how the
  // not-found page renders.
  await page.goto("/checkin", { waitUntil: "commit" });

  await expect(page).toHaveURL(new RegExp(SIGN_IN));
});
