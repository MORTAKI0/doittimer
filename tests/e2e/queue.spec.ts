import { test, expect } from "@playwright/test";
import { uniqueTitle } from "./helpers";

test("today queue supports add, reorder, and focus next up", async ({ page }) => {
  const titleA = uniqueTitle("E2E-Queue-A");
  const titleB = uniqueTitle("E2E-Queue-B");
  const titleC = uniqueTitle("E2E-Queue-C");
  const queueSection = page
    .getByRole("heading", { name: "Today Queue" })
    .locator("xpath=ancestor::section[1]");
  const queueList = queueSection.locator("ul").first();
  const tasksSection = page
    .getByRole("heading", { name: "Your Tasks" })
    .locator("xpath=ancestor::section[1]");
  const tasksList = tasksSection.locator("ul").first();

  async function clearTodayQueue() {
    await page.goto("/tasks");
    const items = queueList.locator("li");

    for (let i = 0; i < 50; i += 1) {
      const count = await items.count();
      if (count === 0) break;

      const first = items.first();
      const removeButton = first.getByRole("button", { name: "Remove" });
      await first.scrollIntoViewIfNeeded();
      await expect(removeButton).toBeEnabled();
      await removeButton.click();
      await expect(items).toHaveCount(count - 1, { timeout: 20000 });
    }

    await expect(items).toHaveCount(0, { timeout: 20000 });
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(queueList.locator("li")).toHaveCount(0, { timeout: 20000 });
  }

  await clearTodayQueue();

  await page.goto("/tasks");

  async function addQueueAction(row: ReturnType<typeof page.locator>, title: string) {
    const queueItems = queueList.locator("li");
    const before = await queueItems.count();
    const addButton = row.getByRole("button", { name: "Add to queue" });
    await expect(addButton).toBeEnabled();
    await addButton.click();
    await expect(queueItems).toHaveCount(before + 1, { timeout: 20000 });
    await expect(queueItems.filter({ hasText: title })).toHaveCount(1, { timeout: 20000 });
    await expect(addButton).toBeDisabled({ timeout: 20000 });
  }

  async function moveQueueAction(button: ReturnType<typeof page.locator>, expectedFirstTitle: string) {
    await expect(button).toBeEnabled();
    await button.click();
    await expect(queueList.locator("li").first()).toContainText(expectedFirstTitle, {
      timeout: 20000,
    });
  }

  for (const title of [titleA, titleB, titleC]) {
    await page.getByRole("button", { name: "Add task" }).first().click();
    await expect(page.getByRole("heading", { name: "Add task" })).toBeVisible();
    await page.getByLabel("Task name").fill(title);
    await page.getByRole("dialog").locator('button[type="submit"]').click();
    await expect(
      tasksList
        .locator("li")
        .filter({ hasText: title })
        .last(),
    ).toBeVisible({ timeout: 20000 });
  }

  const rowA = tasksList.locator("li").filter({ hasText: titleA }).last();
  const rowB = tasksList.locator("li").filter({ hasText: titleB }).last();
  const rowC = tasksList.locator("li").filter({ hasText: titleC }).last();

  await addQueueAction(rowA, titleA);
  await addQueueAction(rowB, titleB);
  await addQueueAction(rowC, titleC);

  const queueItems = queueList.locator("li");
  await expect(queueItems).toHaveCount(3);
  await expect(queueItems.nth(0)).toContainText(titleA);
  await expect(queueItems.nth(1)).toContainText(titleB);
  await expect(queueItems.nth(2)).toContainText(titleC);

  await page.goto("/focus");
  await expect(page.getByTestId("next-up")).toContainText(titleA);

  await page.getByTestId("next-up-switch").click();
  await expect(
    page.locator('button[aria-haspopup="listbox"]').first(),
  ).toContainText(titleA, { timeout: 10000 });

  await page.goto("/tasks");
  const queue = queueList;
  const rowBAfter = queue.locator("li", { hasText: titleB });
  await moveQueueAction(rowBAfter.getByRole("button", { name: "Up" }), titleB);
  const queueAfter = page
    .getByRole("heading", { name: "Today Queue" })
    .locator("xpath=ancestor::section[1]")
    .locator("ul")
    .first();

  await expect(queueAfter.locator("li").first()).toContainText(titleB, { timeout: 15000 });
  const updatedQueueItems = queueAfter.locator("li");
  await expect(updatedQueueItems.nth(1)).toContainText(titleA);

  await page.goto("/focus");
  await expect(page.getByTestId("next-up")).toContainText(titleB);
});
