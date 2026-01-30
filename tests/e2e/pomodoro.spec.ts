import { test, expect, type Page } from "@playwright/test";
import { ensureNoActiveSession, startSession } from "./helpers";

const pomodoroEnabled = process.env.E2E_POMODORO_V2 === "1";

async function setPomodoroDurations(page: Page) {
  await page.goto("/settings");
  await page.getByLabel("Work minutes").fill("1");
  await page.getByLabel("Short break minutes").fill("1");
  await page.getByLabel("Long break minutes").fill("1");
  await page.getByLabel("Long break every").fill("2");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
}

test.describe("pomodoro v2", () => {
  test.skip(!pomodoroEnabled, "E2E_POMODORO_V2 not enabled for the test user.");

  test("phase transitions and pause are refresh-safe", async ({ page }) => {
    await setPomodoroDurations(page);

    await page.goto("/focus");
    await ensureNoActiveSession(page);
    await startSession(page);

    // --- short-lived debug (easy to remove later) ---
    const requestLogger = (req: any) => {
      const url = req.url();
      if (/skip|pomodoro|rpc|focus/i.test(url)) {
        console.log("REQ:", req.method(), url);
      }
    };

    const responseLogger = (res: any) => {
      const url = res.url();
      if (/skip|pomodoro|rpc|focus/i.test(url)) {
        console.log("RES:", res.status(), url);
      }
    };

    page.on("request", requestLogger);
    page.on("response", responseLogger);

    try {
      await expect(page.getByText("Phase:")).toBeVisible();
      await expect(page.getByText("Work", { exact: true })).toBeVisible();

      // Skip phase triggers a Next.js server action:
      // browser calls POST /focus, server executes Supabase RPC.
      const [skipResp] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("/focus") && r.request().method() === "POST",
          { timeout: 10_000 },
        ),
        page.getByRole("button", { name: /skip phase/i }).click(),
      ]);

      console.log("skip server-action status:", skipResp.status());
      await page.waitForTimeout(250); // tiny buffer for UI update

      // Assert break state directly (avoid getByText(/break/i) strict-mode ambiguity)
      await expect(page.getByText("Short Break", { exact: true })).toBeVisible({ timeout: 10_000 });

      // Ensure refresh-safe
      await page.reload();
      await expect(page.getByText("Short Break", { exact: true })).toBeVisible({ timeout: 10_000 });

      // Pause + refresh-safe resume
      await page.getByRole("button", { name: /pause/i }).click();
      await expect(page.getByText("Paused")).toBeVisible();

      await page.reload();
      await expect(page.getByText("Short Break", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /resume/i })).toBeVisible();

      await page.getByRole("button", { name: /resume/i }).click();
      await expect(page.getByText("Paused")).toHaveCount(0);
    } finally {
      // cleanup debug listeners + session state
      page.off("request", requestLogger);
      page.off("response", responseLogger);
      await ensureNoActiveSession(page);
    }
  });
});
