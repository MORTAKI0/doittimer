import { test, expect } from "@playwright/test";
import { uniqueTitle } from "./helpers";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("create, toggle, edit, delete a task", async ({ page }) => {
  const title = uniqueTitle("E2E-Task");
  const updatedTitle = `${title}-Updated`;

  await page.goto("/tasks");

  // Create
  await page.getByLabel("Task title").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.locator("li", { hasText: title })).toBeVisible({ timeout: 20000 });

  // Anchor row via checkbox (stable selector)
  const checkbox = page.getByRole("checkbox", {
    name: new RegExp(`Mark ${escapeRegExp(title)} as completed`),
  });
  await expect(checkbox).toBeVisible({ timeout: 20000 });

  const row = page.locator("li").filter({ has: checkbox });

  // Toggle
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  // Edit (within the SAME row)
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

  const oldCb = page.getByRole("checkbox", {
    name: new RegExp(`^Mark ${escapeRegExp(title)} as completed$`),
  });
  const newCb = page.getByRole("checkbox", {
    name: new RegExp(`^Mark ${escapeRegExp(updatedTitle)} as completed$`),
  });

  // Server truth: reload + poll until checkbox label updates
  await expect
    .poll(
      async () => {
        await page.reload();
        await page.waitForLoadState("domcontentloaded");

        const oldExists = (await oldCb.count()) > 0;
        const newExists = (await newCb.count()) > 0;

        return { oldExists, newExists };
      },
      { timeout: 60000, intervals: [1000, 1500, 2000, 3000] },
    )
    .toEqual({ oldExists: false, newExists: true });

  // Delete the UPDATED row (anchor via updated checkbox)
  const updatedRow = page.locator("li").filter({ has: newCb });

  page.once("dialog", (dialog) => dialog.accept());
  await updatedRow.getByRole("button", { name: "Delete task" }).click();

  // Confirm it’s gone by checkbox label (strongest signal)
  await expect(newCb).toHaveCount(0, { timeout: 20000 });
});
