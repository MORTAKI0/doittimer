import { test, expect } from "@playwright/test";

test("data management card controls exist on settings", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Data Management" })).toBeVisible();

  const exportXlsx = page.getByRole("link", { name: "Export Excel (.xlsx)" });
  await expect(exportXlsx).toBeVisible();
  await expect(exportXlsx).toHaveAttribute("href", "/api/data/export?format=xlsx");

  const exportCsv = page.getByRole("link", { name: "Export CSV (.zip)" });
  await expect(exportCsv).toBeVisible();
  await expect(exportCsv).toHaveAttribute("href", "/api/data/export?format=csv");

  const submitButton = page.getByTestId("data-import-submit");
  await expect(submitButton).toBeDisabled();

  await expect(page.getByTestId("data-import-confirm")).toHaveCount(0);

  const modeSelect = page.getByTestId("data-import-mode");
  await modeSelect.selectOption("replace");
  await expect(page.getByTestId("data-import-confirm")).toBeVisible();

  const fileInput = page.getByTestId("data-import-file");
  await fileInput.setInputFiles({
    name: "data.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("test"),
  });

  await expect(submitButton).toBeDisabled();

  await page.getByTestId("data-import-confirm").fill("DELETE");
  await expect(submitButton).toBeEnabled();

  await modeSelect.selectOption("merge");
  await expect(page.getByTestId("data-import-confirm")).toHaveCount(0);
  await expect(submitButton).toBeEnabled();
});
