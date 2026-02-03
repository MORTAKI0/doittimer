import { test, expect } from "@playwright/test";
import { uniqueTitle } from "./helpers";

test("today queue supports add, reorder, and focus next up", async ({ page }) => {
  const titleA = uniqueTitle("E2E-Queue-A");
  const titleB = uniqueTitle("E2E-Queue-B");
  const titleC = uniqueTitle("E2E-Queue-C");

  async function clearTodayQueue() {
    await page.goto("/tasks");
    const queue = page.getByTestId("today-queue");
    const items = queue.locator("li");

    async function clickQueueMutation(locator: ReturnType<typeof page.locator>) {
      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("/tasks") && r.request().method() === "POST",
          { timeout: 15000 },
        ),
        locator.click(),
      ]);

      if (!response.ok()) {
        const body = await response.text().catch(() => "");
        throw new Error(`Queue mutation failed (${response.status()}): ${body}`);
      }
    }

    async function getQueueRowKey(li: ReturnType<typeof page.locator>) {
      const raw = await li.locator("span").first().innerText();
      return raw.replace(/\s+/g, " ").trim();
    }

    for (let i = 0; i < 50; i += 1) {
      const count = await items.count();
      if (count === 0) break;

      const first = items.first();
      const key = await getQueueRowKey(first);
      const removeButton = first.getByRole("button", { name: /remove from queue/i });
      await first.scrollIntoViewIfNeeded();
      await expect(removeButton).toBeEnabled();
      await clickQueueMutation(removeButton);
      await expect(queue.locator("li", { hasText: key })).toHaveCount(0, { timeout: 20000 });
      await expect.poll(async () => items.count()).toBeLessThan(count);
    }

    await expect(items).toHaveCount(0, { timeout: 20000 });
  }

  await clearTodayQueue();

  await page.goto("/tasks");

  async function clickQueueAction(locator: ReturnType<typeof page.locator>) {
    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes("/tasks") && response.request().method() === "POST",
        { timeout: 10000 },
      ),
      locator.click(),
    ]);
  }

  for (const title of [titleA, titleB, titleC]) {
    await page.getByLabel("Task title").fill(title);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.locator("li", { hasText: title })).toBeVisible({ timeout: 20000 });
  }

  const rowA = page.locator("li", { hasText: titleA });
  const rowB = page.locator("li", { hasText: titleB });
  const rowC = page.locator("li", { hasText: titleC });

  await clickQueueAction(rowA.locator('[data-testid^="queue-add-"]'));
  await clickQueueAction(rowB.locator('[data-testid^="queue-add-"]'));
  await clickQueueAction(rowC.locator('[data-testid^="queue-add-"]'));

  const queueItems = page.getByTestId("today-queue").locator("li");
  await expect(queueItems).toHaveCount(3);
  await expect(queueItems.nth(0)).toContainText(titleA);
  await expect(queueItems.nth(1)).toContainText(titleB);
  await expect(queueItems.nth(2)).toContainText(titleC);

  await page.goto("/focus");
  await expect(page.getByTestId("next-up")).toContainText(titleA);

  await page.getByTestId("next-up-switch").click();
  await expect(
    page.getByLabel("Link a task").locator("option:checked"),
  ).toHaveText(titleA);

  await page.goto("/tasks");
  const queue = page.getByTestId("today-queue");
  const rowBAfter = queue.locator("li", { hasText: titleB });
  await clickQueueAction(rowBAfter.getByRole("button", { name: /move up/i }));
  await page.reload();
  const queueAfter = page.getByTestId("today-queue");

  await expect(queueAfter.locator("li").first()).toContainText(titleB, { timeout: 15000 });
  const updatedQueueItems = queueAfter.locator("li");
  await expect(updatedQueueItems.nth(1)).toContainText(titleA);

  await page.goto("/focus");
  await expect(page.getByTestId("next-up")).toContainText(titleB);
});
