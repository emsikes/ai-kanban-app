import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

const switcher = (page: Page) =>
  page.getByRole("button", { name: /switch project/i });

test.beforeEach(async ({ page }) => {
  await login(page);
  await expect(switcher(page)).toBeVisible();
});

async function createProject(page: Page, name: string) {
  await switcher(page).click();
  await page.getByPlaceholder("New project name").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(switcher(page)).toHaveText(new RegExp(name));
  // Creating leaves the menu open; close it so callers start from a known state.
  await switcher(page).click();
  await expect(page.getByPlaceholder("New project name")).toBeHidden();
}

test("creates a project, switches to it, and isolates its cards", async ({
  page,
}) => {
  await createProject(page, "E2E Project");
  await expect(page.locator('[data-testid^="card-"]')).toHaveCount(0);

  const column = page.locator('[data-testid^="column-"]').first();
  await column.getByRole("button", { name: /add a card/i }).click();
  await column.getByPlaceholder("Card title").fill("Isolated card");
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes("/board") &&
      response.request().method() === "PUT"
  );
  await column.getByRole("button", { name: /add card/i }).click();
  await saved;
  await expect(page.getByText("Isolated card")).toBeVisible();

  // Switch back to the seeded project; the isolated card must not appear.
  await switcher(page).click();
  await page.getByRole("button", { name: "My Board", exact: true }).click();
  await expect(switcher(page)).toHaveText(/My Board/);
  await expect(page.getByText("Isolated card")).toHaveCount(0);
});

test("renames a project", async ({ page }) => {
  await createProject(page, "ToRename");
  await switcher(page).click();
  await page.getByRole("button", { name: /rename torename/i }).click();
  const input = page.getByLabel("Project name");
  await input.fill("Renamed E2E");
  await input.press("Enter");
  await expect(switcher(page)).toHaveText(/Renamed E2E/);
});

test("deletes a project", async ({ page }) => {
  await createProject(page, "ToDelete");
  page.on("dialog", (dialog) => dialog.accept());
  await switcher(page).click();
  await page.getByRole("button", { name: /delete todelete/i }).click();
  await expect(switcher(page)).not.toHaveText(/ToDelete/);
});
