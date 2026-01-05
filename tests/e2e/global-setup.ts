import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const storageStatePath = path.resolve("playwright/.auth/state.json");

export default async function globalSetup() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_EMAIL and E2E_PASSWORD must be set for Playwright.");
  }

  await fs.mkdir(path.dirname(storageStatePath), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(new URL("/login", baseURL).toString());
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (min 8)").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL(/\/dashboard/);
  await page.context().storageState({ path: storageStatePath });

  await browser.close();
}
