import { type Page } from "@playwright/test";
import { initialData } from "../src/lib/kanban";

export async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel(/username/i).fill("user");
  await page.getByLabel(/password/i).fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

// Reset the signed-in user's board to the known seed so tests are deterministic.
export async function resetBoard(page: Page) {
  await page.request.put("/api/board", { data: initialData });
}
