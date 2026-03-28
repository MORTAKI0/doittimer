import { expect, test } from "@playwright/test";

test.describe("dashboard optimized experience", () => {
  test("renders the optimized dashboard by default inside the authenticated shell", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/good/i);
    await expect(page.getByText("Execution Over Time")).toBeVisible();
    await expect(page.getByText("Open Loops")).toBeVisible();
    await expect(page.getByText("Today's Narrative")).toBeVisible();
    await expect(page.getByText("Performance")).toBeVisible();

    await expect(page.locator(".app-sidebar")).toHaveCount(1);
    await expect(page.getByLabel("Main navigation")).toBeVisible();
    await expect(page.getByLabel("Dashboard controls")).toBeVisible();
    await expect(page.getByTestId("year-focus-heatmap")).toBeVisible();
  });

  test("keeps optimized dashboard content while mobile shell navigation remains available", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/good/i);
    await expect(page.locator('nav[aria-label="Bottom navigation"]')).toHaveCount(1);
    await expect(page.locator('header:has-text("DoItTimer")')).toHaveCount(1);
    await expect(page.getByLabel("Dashboard controls")).toHaveCount(0);
  });

  test("keeps the yearly heatmap within the dashboard width and shows a cursor-following tooltip", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/dashboard");

    const heatmap = page.getByTestId("year-focus-heatmap");
    const grid = page.getByTestId("year-focus-heatmap-grid");

    await expect(heatmap).toBeVisible();
    await expect
      .poll(async () => {
        return grid.evaluate((element) => element.scrollWidth <= element.clientWidth);
      })
      .toBe(true);

    await grid.locator('[data-kind="day"]').first().hover();
    await expect(page.getByTestId("year-focus-heatmap-tooltip")).toContainText("min tracked");
  });

  test("renders the yearly heatmap on home without horizontal overflow above 768px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/home");

    const grid = page.getByTestId("year-focus-heatmap-grid");
    await expect(grid).toBeVisible();
    await expect
      .poll(async () => {
        return grid.evaluate((element) => element.scrollWidth <= element.clientWidth);
      })
      .toBe(true);
  });
});
