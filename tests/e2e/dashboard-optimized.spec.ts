import { expect, test } from "@playwright/test";

test.describe("dashboard optimized experience", () => {
  test("renders the optimized dashboard by default without legacy shell chrome", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/good/i);
    await expect(page.getByText("Execution Over Time")).toBeVisible();
    await expect(page.getByText("Open Loops")).toBeVisible();
    await expect(page.getByText("Today's Narrative")).toBeVisible();
    await expect(page.getByText("Performance")).toBeVisible();

    await expect(page.locator(".app-sidebar")).toHaveCount(0);
    await expect(page.locator('header:has-text("DoItTimer")')).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Bottom navigation"]')).toHaveCount(0);
  });

  test("keeps optimized dashboard controls available on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");

    await expect(page.getByLabel("Dashboard controls")).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search tasks" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open focus" })).toBeVisible();
    await expect(page.locator('nav[aria-label="Bottom navigation"]')).toHaveCount(0);
  });
});
