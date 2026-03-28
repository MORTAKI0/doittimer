import { expect, test } from "@playwright/test";

import { uniqueTitle } from "./helpers";

test("create, assign, filter, and delete a label", async ({ page }) => {
  const labelName = uniqueTitle("Client");
  const labeledTaskTitle = uniqueTitle("Labeled-task");
  const plainTaskTitle = uniqueTitle("Plain-task");

  await page.goto("/filters-labels");
  await page.getByLabel("New label name").fill(labelName);
  await page.getByRole("button", { name: "Create label" }).click();
  await expect(page.getByText(labelName)).toBeVisible({ timeout: 20000 });

  await page.goto("/tasks");

  for (const title of [labeledTaskTitle, plainTaskTitle]) {
    await page.getByRole("main").getByRole("button", { name: "Add task" }).first().click();
    await expect(page.getByLabel("Task name")).toBeVisible({ timeout: 20000 });
    await page.getByLabel("Task name").fill(title);
    await page.getByRole("dialog").locator('button[type="submit"]').click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 20000 });
  }

  const labeledRow = page.locator("li").filter({ hasText: labeledTaskTitle });
  await labeledRow.getByRole("button", { name: "Edit task" }).click();
  await labeledRow.getByLabel("Search labels").fill(labelName);
  await labeledRow.getByRole("button", { name: `Select label ${labelName}` }).click();
  const saveButton = labeledRow.getByRole("button", { name: "Save" });
  await saveButton.click();
  await expect(saveButton).toHaveCount(0, { timeout: 20000 });
  await expect(labeledRow.getByRole("button", { name: "Edit task" })).toBeVisible({
    timeout: 20000,
  });

  const labelFilterChip = page.getByRole("button", { name: `Add label filter ${labelName}` });
  await labelFilterChip.click();

  await expect(page.getByText(labeledTaskTitle)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(plainTaskTitle)).toHaveCount(0);

  await page.goto("/filters-labels");
  const labelCard = page.locator("li").filter({ hasText: labelName });
  page.once("dialog", (dialog) => dialog.accept());
  await labelCard.getByRole("button", { name: `Delete label ${labelName}` }).click();
  await expect(page.getByText(labelName)).toHaveCount(0);

  await page.goto("/tasks");
  await expect(page.getByText(labeledTaskTitle)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(labelName)).toHaveCount(0);
});
