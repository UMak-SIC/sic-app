import { expect, test } from "@playwright/test";

test("shows a useful recovery path when the browser denies camera access", async ({ page }) => {
  await page.goto("/checkin");

  await page.getByRole("button", { name: "Open camera" }).click();

  await expect(page.getByText("Camera access was not granted. Allow camera access, then try again.")).toHaveText(
    "Camera access was not granted. Allow camera access, then try again.",
  );
  await expect(page.getByLabel("Ticket code fallback")).toBeVisible();
});
