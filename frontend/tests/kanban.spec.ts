import { expect, test } from "@playwright/test";
import { login, resetBoard } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page);
  await resetBoard(page);
  await page.reload();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("loads the kanban board", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "Kanban Studio" })
  ).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("removes a card from a column", async ({ page }) => {
  const card = page.getByTestId("card-card-1");
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /delete/i }).click();
  await expect(page.getByTestId("card-card-1")).toHaveCount(0);
});

test("edits a card's title inline and it persists", async ({ page }) => {
  const card = page.getByTestId("card-card-1");
  await card.getByText("Align roadmap themes").click();
  const input = card.getByLabel("Card title");
  await input.fill("Edited via e2e");
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes("/board") &&
      response.request().method() === "PUT"
  );
  await input.press("Enter");
  await saved;

  await page.reload();
  await expect(page.getByText("Edited via e2e")).toBeVisible();
});

test("persists edits across a reload", async ({ page }) => {
  const column = page.locator('[data-testid^="column-"]').first();
  await column.getByLabel("Column title").fill("Renamed Column");

  await column.getByRole("button", { name: /add a card/i }).click();
  await column.getByPlaceholder("Card title").fill("Durable card");

  const saved = page.waitForResponse(
    (response) =>
      response.url().includes("/board") &&
      response.request().method() === "PUT"
  );
  await column.getByRole("button", { name: /add card/i }).click();
  await saved;

  await page.reload();
  const reloaded = page.locator('[data-testid^="column-"]').first();
  await expect(reloaded.getByLabel("Column title")).toHaveValue(
    "Renamed Column"
  );
  await expect(page.getByText("Durable card")).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  const card = page.getByTestId("card-card-1");
  const targetColumn = page.getByTestId("column-col-review");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = columnBox.x + columnBox.width / 2;
  const endY = columnBox.y + 120;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Nudge past the dnd-kit 6px activation threshold, then drag and settle.
  await page.mouse.move(startX + 12, startY + 12, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.mouse.move(endX, endY + 1, { steps: 3 });
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
});
