import { expect, test } from "@playwright/test";

const dashboardOptimizedEnabled =
  process.env.DASHBOARD_OPTIMIZED_FOUNDATION_ENABLED === "1";

test.describe("dashboard optimized foundation", () => {
  test.skip(
    !dashboardOptimizedEnabled,
    "DASHBOARD_OPTIMIZED_FOUNDATION_ENABLED is not enabled.",
  );

  test("renders the optimized dashboard foundation", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/good/i);
    await expect(page.getByText("Execution Over Time")).toBeVisible();
    await expect(page.getByText("Open Loops")).toBeVisible();
    await expect(page.getByText("Today's Narrative")).toBeVisible();
    await expect(page.getByText("Performance")).toBeVisible();
  });
});
