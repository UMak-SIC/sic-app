import { expect, test } from "@playwright/test";

// `/checkin` is protected by `app/proxy.ts`, and the sign-in page that TSK-0201
// still owes does not exist yet, so no browser can reach this page
// authenticated or not. The redirect itself is covered in
// `route-protection.spec.ts`.
//
// Restore this coverage in the pull request that adds `app/app/(auth)/sign-in`,
// or a test-only session seam. See issue #16.
test.skip(
  "shows a useful recovery path when the browser denies camera access",
  async ({ page }) => {
    await page.goto("/checkin");

    await page.getByRole("button", { name: "Open camera" }).click();

    await expect(
      page.getByText("Camera access was not granted. Allow camera access, then try again."),
    ).toHaveText("Camera access was not granted. Allow camera access, then try again.");
    await expect(page.getByLabel("Ticket code fallback")).toBeVisible();
  },
);
