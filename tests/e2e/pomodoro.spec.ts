import { test, expect, type Page } from "@playwright/test";
import { ensureNoActiveSession, startSession, stopSession, uniqueTitle } from "./helpers";

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

async function skipPhase(page: Page) {
  const [skipResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/focus") && r.request().method() === "POST",
      { timeout: 10_000 },
    ),
    page.getByRole("button", { name: /skip phase/i }).click(),
  ]);

  expect(skipResp.ok()).toBeTruthy();
  await page.waitForTimeout(250);
}

async function readWorkPomodorosCompletedToday(page: Page): Promise<number> {
  await page.goto("/dashboard");
  const card = page
    .getByText("Work pomodoros completed today")
    .locator("..")
    .locator("..");

  const raw = (await card.locator("p").first().innerText()).trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readRemainingMinutes(page: Page): Promise<number> {
  const text = (await page.getByText(/remaining:/i).first().innerText()).trim();
  const match = text.match(/(\d+)m/);
  if (!match) return 0;
  const minutes = Number.parseInt(match[1] ?? "0", 10);
  return Number.isFinite(minutes) ? minutes : 0;
}

async function expectRemainingMinutesNear(page: Page, expected: number) {
  const minutes = await readRemainingMinutes(page);
  expect(minutes).toBeGreaterThanOrEqual(Math.max(0, expected - 1));
  expect(minutes).toBeLessThanOrEqual(expected);
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

  test("work pomodoros completed today appear on dashboard", async ({ page }) => {
    await setPomodoroDurations(page);

    // NOTE: This test runs after "phase transitions..." which may have already recorded a work_completed event.
    // We assert the delta (+2) instead of an absolute value.
    const baseline = await readWorkPomodorosCompletedToday(page);

    const title = uniqueTitle("E2E-Pomodoro");
    await page.goto("/tasks");
    await page.getByLabel("Task title").fill(title);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.locator("li", { hasText: title })).toBeVisible({ timeout: 20000 });

    await page.goto("/focus");
    await ensureNoActiveSession(page);
    await page.getByLabel("Link a task").selectOption({ label: title });
    await startSession(page);

    await expect(page.getByText("Work", { exact: true })).toBeVisible();

    await skipPhase(page); // Work -> Short Break (work_completed)
    await expect(page.getByText("Short Break", { exact: true })).toBeVisible({ timeout: 10000 });

    await skipPhase(page); // Short Break -> Work
    await expect(page.getByText("Work", { exact: true })).toBeVisible({ timeout: 10000 });

    await skipPhase(page); // Work -> Long Break (work_completed)
    await expect(page.getByText("Long Break", { exact: true })).toBeVisible({ timeout: 10000 });

    await stopSession(page);

    const after = await readWorkPomodorosCompletedToday(page);
    expect(after).toBe(baseline + 2);

    // Assert task-level stats using the Tasks list (stable: this is a brand-new task).
    await page.goto("/tasks");
    const row = page.locator("li", { hasText: title });
    await expect(row).toContainText("Pomodoros today: 2");
    await expect(row).toContainText("Pomodoros total: 2");
  });

  test("apply deep work preset updates focus durations", async ({ page }) => {
    const title = uniqueTitle("E2E-Preset");
    await page.goto("/tasks");
    await page.getByLabel("Task title").fill(title);
    await page.getByRole("button", { name: "Add task" }).click();

    const row = page.locator("li", { hasText: title });
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.getByRole("button", { name: "Edit task" }).click();

    const presetBtn = page.getByRole("button", { name: /apply deep work preset/i });
    await expect(presetBtn).toBeVisible({ timeout: 10000 });
    await presetBtn.click();
    const quickSaveResp = await page
      .waitForResponse(
        (r) => r.request().method() === "POST" && r.url().includes("/tasks"),
        { timeout: 1500 },
      )
      .catch(() => null);

    if (quickSaveResp) {
      expect(quickSaveResp.ok()).toBeTruthy();
    } else {
      const saveBtn = page.getByRole("button", { name: "Save" });
      if (await saveBtn.isVisible()) {
        const [saveResp] = await Promise.all([
          page.waitForResponse(
            (r) => r.request().method() === "POST" && r.url().includes("/tasks"),
            { timeout: 10000 },
          ),
          saveBtn.click(),
        ]);
        expect(saveResp.ok()).toBeTruthy();
      }
    }
    await expect(page.getByTestId("task-pomodoro-work")).toHaveValue("50");
    await expect(page.getByTestId("task-pomodoro-short")).toHaveValue("10");
    await expect(page.getByTestId("task-pomodoro-long")).toHaveValue("20");
    await expect(page.getByTestId("task-pomodoro-every")).toHaveValue("2");

    await page.goto("/focus");
    await ensureNoActiveSession(page);
    await page.getByLabel("Link a task").selectOption({ label: title });
    await startSession(page);

    await expect(page.getByText("Work", { exact: true })).toBeVisible();
    await expectRemainingMinutesNear(page, 50);

    await skipPhase(page);
    await expect(page.getByText("Short Break", { exact: true })).toBeVisible({ timeout: 10000 });
    await expectRemainingMinutesNear(page, 10);

    await skipPhase(page);
    await expect(page.getByText("Work", { exact: true })).toBeVisible({ timeout: 10000 });
    await expectRemainingMinutesNear(page, 50);

    await skipPhase(page);
    await expect(page.getByText("Long Break", { exact: true })).toBeVisible({ timeout: 10000 });
    await expectRemainingMinutesNear(page, 20);

    await stopSession(page);
  });
});
