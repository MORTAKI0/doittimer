import { test, expect } from "@playwright/test";
import { ensureNoActiveSession, getSessionsCount, startSession, stopSession } from "./helpers";

test("dashboard stats update after a session", async ({ page }) => {
  await page.goto("/dashboard");
  const before = await getSessionsCount(page);

  await page.goto("/focus");
  await ensureNoActiveSession(page);
  await startSession(page);
  await page.waitForTimeout(1100);
  await stopSession(page);

  await page.goto("/dashboard");
  const after = await getSessionsCount(page);

  expect(after).toBeGreaterThan(before);
});
