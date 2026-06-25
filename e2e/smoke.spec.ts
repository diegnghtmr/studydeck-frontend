import { test, expect } from "@playwright/test";

/**
 * Environment-robust smoke tests. The app behaves differently depending on whether OIDC is
 * configured: with OIDC (local/prod) the root route redirects to /login; without it (CI default)
 * authentication is bypassed and the root route renders the app shell. These assertions hold in
 * both cases and require no backend.
 */
test.describe("StudyDeck smoke tests", () => {
  test("app boots at / (app shell or login)", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
    await expect(
      page.getByTestId("sidebar").or(page.getByTestId("login-page")),
    ).toBeVisible();
  });

  test("login route renders the login page with the brand", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-page")).toBeVisible();
    // The login page shows the StudyDeck brand lockup in every environment.
    // The heading text varies with OIDC config ("Welcome back" when configured,
    // a setup notice otherwise), so assert the stable brand mark instead.
    await expect(page.getByText(/studydeck/i).first()).toBeVisible();
  });
});
