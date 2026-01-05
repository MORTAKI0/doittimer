import { expect, type Page } from "@playwright/test";

export const STORAGE_STATE = "playwright/.auth/state.json";

export function uniqueTitle(prefix = "E2E") {
  return `${prefix}-${Date.now()}`;
}

export async function ensureNoActiveSession(page: Page) {
  const stopButton = page.getByRole("button", { name: "Stop session" });
  if (await stopButton.isVisible()) {
    await stopButton.click();
    await expect(page.getByRole("button", { name: "Start session" })).toBeVisible();
  }
}

export async function startSession(page: Page) {
  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page.getByRole("button", { name: "Stop session" })).toBeVisible();
}

export async function stopSession(page: Page) {
  await page.getByRole("button", { name: "Stop session" }).click();
  await expect(page.getByRole("button", { name: "Start session" })).toBeVisible();
}

export async function getSessionsCount(page: Page) {
  const card = page.getByText("Sessions today").locator("..").locator("..");
  const value = (await card.locator("p").first().innerText()).trim();
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
