import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const storageState = "playwright/.auth/state.json";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    headless: true,
    storageState,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
