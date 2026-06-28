import { test, expect } from "@playwright/test";

test.describe("Login flow", () => {
  test("patient tab has email field and magic-link button", async ({ page }) => {
    await page.goto("/login");
    // Default tab is patient (magic link — no password field)
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    // Password field should NOT be present on the patient tab
    await expect(page.locator('input[type="password"]')).not.toBeVisible();
  });

  test("staff tab reveals email and password fields", async ({ page }) => {
    await page.goto("/login");
    // Click the Staff tab
    await page.click("button:has-text('Staff')");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("wrong staff credentials shows error", async ({ page }) => {
    await page.goto("/login");
    // Switch to staff tab
    await page.click("button:has-text('Staff')");
    await page.fill('input[name="email"]', "wrong@example.com");
    await page.fill('input[name="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');
    // Should stay on login or show error (not navigate to dashboard)
    await page.waitForTimeout(2000);
    const url = page.url();
    const hasError = await page.locator("[role='alert'], .err, .error, [data-error]").count() > 0
      || url.includes("/login");
    expect(hasError).toBeTruthy();
  });
});
