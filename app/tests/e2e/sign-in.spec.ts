import { expect, test } from "@playwright/test";

// The sign-in form shipped as a stub: it called preventDefault and nothing else,
// so there was no way to establish a session through the UI at all. These cover
// the half that can be tested without provisioning a real Neon Auth user.
//
// A successful sign-in is not covered. It needs a real user in Neon Auth and a
// matching row in the `admins` table, neither of which this harness provisions,
// so asserting it would be a test that passes for the wrong reason.
//
// These assertions are deliberately about the contract rather than about which
// failure occurs. Whether a wrong password comes back as a rejected credential or
// as a transport error depends on whether the Neon Auth instance trusts this
// app's origin, which is configured in the Neon console and not in this repo.
// Asserting one specific message would make the suite red for a reason that has
// nothing to do with this code.

test("reports a failed sign-in in plain language and stays signed out", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      // The failed request itself is expected and logs to the console.
      if (!message.text().includes("Failed to load resource")) {
        consoleErrors.push(message.text());
      }
    }
  });

  await page.goto("/login");

  await page.getByLabel(/email/i).fill("nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("definitely-not-the-password");
  await page.getByRole("button", { name: /^login$/i }).click();

  // Next renders its own role="alert" route announcer, so the message is
  // targeted by id rather than by role.
  const error = page.locator("#sign-in-error");
  await expect(error).toBeVisible();

  // The charter bans surfacing API error strings and backend terminology, so
  // whatever the failure was, it has to read as an operator instruction. The
  // endpoint does answer raw codes — depending on the host it can be
  // {"message":"Invalid origin","code":"INVALID_ORIGIN"} or
  // {"code":"INVALID_EMAIL_OR_PASSWORD"} — and none of that should reach a user.
  await expect(error).not.toContainText(
    /invalid|unauthorized|forbidden|api|origin|401|403|error code/i
  );

  // A failed sign-in must leave the visitor where they were, with the form usable.
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /^login$/i })).toBeEnabled();

  // The client is wired to the SDK rather than stubbed, so no module-level
  // failure should be sitting in the console.
  expect(consoleErrors).toEqual([]);
});

test("reports an unreachable sign-in service instead of failing silently", async ({
  page,
}) => {
  await page.route("**/api/auth/**", (route) => route.abort("failed"));

  await page.goto("/login");

  await page.getByLabel(/email/i).fill("nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("definitely-not-the-password");
  await page.getByRole("button", { name: /^login$/i }).click();

  // An aborted request must still surface a message and leave the button usable
  // rather than spinning forever, which is what a missing catch block produces.
  await expect(page.locator("#sign-in-error")).toBeVisible();
  await expect(page.getByRole("button", { name: /^login$/i })).toBeEnabled();
});
