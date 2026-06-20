import { expect, test } from "@playwright/test";
import { login, resetBoard } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page);
  await resetBoard(page);
  await page.reload();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("AI chat adds a card and the board refreshes without a reload", async ({
  page,
}) => {
  test.skip(!process.env.OPENAI_API_KEY, "requires OPENAI_API_KEY");

  await page
    .getByLabel("Message")
    .fill(
      "Add a card titled ZebraTask to the Backlog column. Keep everything else unchanged."
    );
  await page.getByRole("button", { name: /send/i }).click();

  // The board auto-refreshes (no manual reload) and shows the AI-created card.
  const newCard = page.locator('[data-testid^="card-"]', {
    hasText: "ZebraTask",
  });
  await expect(newCard.first()).toBeVisible({ timeout: 30_000 });
});
