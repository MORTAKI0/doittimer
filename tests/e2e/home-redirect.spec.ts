import { test, expect } from "@playwright/test";

test("redirects authenticated users from / to /dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
});

test("shows marketing landing for unauthenticated users on /", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [],
    },
  });
  const page = await context.newPage();

  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Create free account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await context.close();
});
