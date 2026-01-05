import { test, expect } from "@playwright/test";
import { ensureNoActiveSession, startSession, stopSession } from "./helpers";

test("start and stop a focus session", async ({ page }) => {
  await page.goto("/focus");
  await ensureNoActiveSession(page);

  await startSession(page);
  await expect(page.getByText("Running")).toBeVisible();

  await page.waitForTimeout(1100);

  await stopSession(page);

  await expect(page.getByText("Running")).toHaveCount(0);

  const sessionsSection = page.getByText("Today's sessions").locator("..");
  const sessionsList = sessionsSection.locator("ul");
  await expect(sessionsList).toBeVisible();
  await expect(sessionsList.locator("li").first()).toBeVisible();
  await expect(sessionsList.locator("li").first()).toContainText(/\d+s|\d+m/);
});
