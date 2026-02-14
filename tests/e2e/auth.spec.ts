import { test, expect } from "@playwright/test";

test("auth session is valid for dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  await expect(page.getByText("Invalid environment variables")).toHaveCount(0);
});
