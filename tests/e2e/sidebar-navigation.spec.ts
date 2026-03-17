import { expect, test } from "@playwright/test";

test("desktop sidebar keeps navigating after visiting Today", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  const sidebar = page.getByLabel("Main navigation");

  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();

  await sidebar.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

  await sidebar.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await sidebar.getByRole("link", { name: "Focus" }).click();
  await expect(page).toHaveURL(/\/focus$/);
  await expect(page.getByRole("heading", { name: "Focus" })).toBeVisible();

  await sidebar.getByRole("link", { name: "Inbox" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();

  await sidebar.getByRole("link", { name: "Upcoming" }).click();
  await expect(page).toHaveURL(/\/upcoming$/);
  await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();

  await page.getByRole("link", { name: "Open settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});
