import { expect, test } from "@playwright/test";

// The whole app sits behind sign-in, and app/app/page.tsx redirects "/" to
// /overview, so an unauthenticated visit to the root now lands on /login. The
// heading below matches the sign-in screen, which is why this used to pass
// against the home page and would otherwise keep passing while testing
// something else entirely.
//
// Asserting the real /overview render needs an authenticated fixture, which
// this harness does not set up yet. Route protection is covered in
// route-protection.spec.ts; this test only pins what a visitor with no session
// is shown.
//
// `waitUntil: "commit"` rather than the default "load": what is being asserted is
// which screen a visitor is shown, not that every asset on it has finished
// downloading. Waiting on "load" couples the assertion to the sign-in page's logo
// going through the image optimizer, which on a cold CI container is slow enough to
// blow the 30s budget and fail a test whose subject passed. The visibility
// assertions below retry on their own, so nothing is checked before the DOM is
// ready. route-protection.spec.ts already navigates this way.
test("presents an unauthenticated visitor with the sign-in screen", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "commit" });

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: /welcome back/i }),
  ).toBeVisible();
});
