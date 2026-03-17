import { expect, test } from "@playwright/test";

test("sidebar navigation diagnostics capture pathname and page updates", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  const consoleMessages: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("[dev-diag]")) {
      consoleMessages.push(text);
    }
  });

  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "unknown"}`);
  });

  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();

  const sidebar = page.getByLabel("Main navigation");

  await sidebar.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

  await sidebar.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  const diagnostics = await page.evaluate(() => window.__DOITTIMER_DEV_DIAGNOSTICS__ ?? []);

  expect(
    diagnostics.some((entry) => entry.event === "nav:click" && entry.label === "Today"),
  ).toBeTruthy();
  expect(
    diagnostics.some((entry) => entry.event === "navigation:location-change" && entry.pathname === "/today"),
  ).toBeTruthy();
  expect(
    diagnostics.some((entry) => entry.event === "navigation:location-change" && entry.pathname === "/dashboard"),
  ).toBeTruthy();
  expect(consoleMessages.some((entry) => entry.includes("[dev-diag]"))).toBeTruthy();
  expect(failedRequests).toEqual([]);
});
