import { expect, test } from "@playwright/test";

import { uniqueTitle } from "./helpers";

test("can create and revoke an automation token from settings", async ({
  page,
  request,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/settings");

  await expect(
    page.getByRole("heading", { name: "Automation & API Access" }),
  ).toBeVisible();

  const tokenName = uniqueTitle("OpenClaw");

  await page.getByTestId("automation-token-create-open").click();
  await page.getByTestId("automation-token-name").fill(tokenName);
  await page.getByTestId("automation-token-create-submit").click();

  const rawToken = (await page
    .getByTestId("automation-token-raw-value")
    .textContent())?.trim();

  expect(rawToken).toBeTruthy();
  expect(rawToken).toMatch(/^ditm_[A-Za-z0-9_-]+$/);

  await page.getByTestId("automation-token-copy").click();
  await expect(page.getByText("Token copied")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => navigator.clipboard.readText())).toBe(
    rawToken,
  );

  const authorizedResponse = await request.get("/api/agent/me", {
    headers: {
      Authorization: `Bearer ${rawToken}`,
    },
  });

  expect(authorizedResponse.status()).toBe(200);
  const authorizedBody = await authorizedResponse.json();
  expect(authorizedBody.success).toBe(true);
  expect(Array.isArray(authorizedBody.data.scopes)).toBe(true);

  await page.getByRole("button", { name: "Done" }).click();

  const tokenPrefix = rawToken?.slice(0, 12) ?? "";
  const tokenRow = page.locator("tr", { hasText: tokenName });
  await expect(tokenRow).toContainText(tokenPrefix);
  await tokenRow.getByRole("button", { name: "Revoke" }).click();

  await expect(
    page.getByText("This will immediately block access for any agent using this token."),
  ).toBeVisible();
  await page.getByTestId("automation-token-revoke-confirm").click();

  await expect(tokenRow).toHaveCount(0);

  const revokedResponse = await request.get("/api/agent/me", {
    headers: {
      Authorization: `Bearer ${rawToken}`,
    },
  });

  expect(revokedResponse.status()).toBe(401);
  const revokedBody = await revokedResponse.json();
  expect(revokedBody.success).toBe(false);
  expect(revokedBody.error.code).toBe("unauthorized");
});
