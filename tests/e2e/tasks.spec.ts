import { test, expect } from "@playwright/test";
import { uniqueTitle } from "./helpers";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function ensureAutoArchiveCompletedIsDisabled(
  page: import("@playwright/test").Page,
) {
  await page.goto("/settings");

  const autoArchiveCheckbox = page.getByLabel("Auto-archive completed tasks");
  await expect(autoArchiveCheckbox).toBeVisible({ timeout: 20000 });

  if (await autoArchiveCheckbox.isChecked()) {
    await autoArchiveCheckbox.uncheck();
    await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 20000 });
  }
}

test("create, toggle, edit, delete a task", async ({ page }) => {
  const title = uniqueTitle("E2E-Task");
  const updatedTitle = `${title}-Updated`;

  await ensureAutoArchiveCompletedIsDisabled(page);
  await page.goto("/tasks");

  // Create
  await page.getByRole("button", { name: "Add task" }).first().click();
  await expect(page.getByRole("heading", { name: "Add task" })).toBeVisible();
  await page.getByLabel("Task name").fill(title);
  await page.getByRole("dialog").locator('button[type="submit"]').click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 20000 });

  // Anchor row via completion button (stable selector)
  const toggleButton = page.getByRole("button", {
    name: new RegExp(`Mark ${escapeRegExp(title)} as completed`),
  });
  await expect(toggleButton).toBeVisible({ timeout: 20000 });

  const row = page.locator("li").filter({ hasText: title });

  // Edit while task is still active
  await row.getByRole("button", { name: "Edit task" }).click();

  // Inline row editor should show an input prefilled with the current title
  const rowInput = row.locator('input[type="text"], input:not([type])').first();
  const saveBtn = row.getByRole("button", { name: "Save" });

  await expect(rowInput).toBeVisible({ timeout: 20000 });
  await expect(saveBtn).toBeVisible({ timeout: 20000 });

  // Prove we are editing the right task (this should be true if the app supports real editing)
  await expect(rowInput).toHaveValue(title, { timeout: 20000 });

  await rowInput.fill(updatedTitle);
  await saveBtn.click();

  // Wait for inline editor to close (Save disappears)
  await expect(saveBtn).toBeHidden({ timeout: 20000 });

  const oldToggle = page.getByRole("button", {
    name: new RegExp(`^Mark ${escapeRegExp(title)} as completed$`),
  });
  const newToggle = page.getByRole("button", {
    name: new RegExp(`^Mark ${escapeRegExp(updatedTitle)} as completed$`),
  });

  // Server truth: reload + poll until checkbox label updates
  await expect
    .poll(
      async () => {
        await page.reload();
        await page.waitForLoadState("domcontentloaded");

        const oldExists = (await oldToggle.count()) > 0;
        const newExists = (await newToggle.count()) > 0;

        return { oldExists, newExists };
      },
      { timeout: 60000, intervals: [1000, 1500, 2000, 3000] },
    )
    .toEqual({ oldExists: false, newExists: true });

  // Toggle to completed, then back to active, waiting for each row mutation to settle.
  const updatedRow = page.locator("li").filter({ hasText: updatedTitle });
  const [completeResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/tasks"),
      { timeout: 10000 },
    ),
    newToggle.click(),
  ]);
  expect(completeResp.ok()).toBeTruthy();

  const activeToggle = updatedRow.getByRole("button", {
    name: new RegExp(`^Mark ${escapeRegExp(updatedTitle)} as active$`),
  });
  await expect(activeToggle).toBeVisible({ timeout: 20000 });
  await expect(activeToggle).toBeEnabled({ timeout: 20000 });

  const [activateResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/tasks"),
      { timeout: 10000 },
    ),
    activeToggle.click(),
  ]);
  expect(activateResp.ok()).toBeTruthy();
  await expect(newToggle).toBeVisible({ timeout: 20000 });
  await expect(updatedRow.getByRole("button", { name: "Archive task" })).toBeEnabled({
    timeout: 20000,
  });

  // Archive the UPDATED row while active.
  page.once("dialog", (dialog) => dialog.accept());
  await updatedRow.getByRole("button", { name: "Archive task" }).click();

  // Confirm it’s gone from the active list
  await expect(updatedRow).toHaveCount(0, { timeout: 20000 });
});
