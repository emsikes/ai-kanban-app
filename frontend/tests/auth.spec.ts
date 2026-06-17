import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("gates the board behind a login form", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);
});

test("rejects invalid credentials", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/username/i).fill("user");
  await page.getByLabel(/password/i).fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByText(/invalid username or password/i)
  ).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);
});

test("logs in with valid credentials and logs back out", async ({ page }) => {
  await login(page);
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);
});
