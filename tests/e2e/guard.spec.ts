import { test, expect } from "@playwright/test";
import { ensureNoActiveSession, startSession, stopSession, STORAGE_STATE } from "./helpers";

test("prevents starting a second active session", async ({ browser, page }) => {
  await page.goto("/focus");
  await ensureNoActiveSession(page);

  const secondContext = await browser.newContext({ storageState: STORAGE_STATE });
  const secondPage = await secondContext.newPage();
  await secondPage.goto("/focus");
  await ensureNoActiveSession(secondPage);

  await startSession(page);
  await expect(page.getByText("Running")).toBeVisible();

  await secondPage.getByRole("button", { name: "Start session" }).click();
  await expect(
    secondPage.getByText(
      "A session is already active. Stop it before starting a new one.",
    ),
  ).toBeVisible();

  await stopSession(page);
  await secondContext.close();
});
