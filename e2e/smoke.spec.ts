import { test, expect } from "@playwright/test";

test.describe("StudyDeck smoke tests", () => {
  test("homepage loads and shows brand wordmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("brand-wordmark")).toBeVisible();
    await expect(page.getByTestId("brand-wordmark")).toHaveText("StudyDeck");
  });

  test("navigation bar is present and sticky", async ({ page }) => {
    await page.goto("/");
    const navbar = page.getByTestId("navbar");
    await expect(navbar).toBeVisible();
  });

  test("decks nav link navigates to decks page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /decks/i }).first().click();
    await expect(page).toHaveURL(/\/decks/);
  });
});
