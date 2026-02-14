import { test, expect } from "@playwright/test";

test("unauthenticated user is redirected away from dashboard", async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await context.close();
});
