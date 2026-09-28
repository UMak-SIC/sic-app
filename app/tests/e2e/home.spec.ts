import { expect, test } from "@playwright/test";

test("renders the home page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /welcome back!/i }),
  ).toBeVisible();
});
