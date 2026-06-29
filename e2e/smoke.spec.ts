import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Central Health Intelligence|CHI|Login/i);
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test("onboarding page loads", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.locator("body")).toBeVisible();
    // Should not redirect away (it's a public page)
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("public clinic page loads", async ({ page }) => {
    await page.goto("/p/casa-elev8");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).toHaveURL(/\/p\/casa-elev8/);
  });

  test("unknown clinic page returns 404", async ({ page }) => {
    const response = await page.goto("/p/zzz-nope-clinic-99999");
    expect(response?.status()).toBe(404);
  });

  test("health endpoint returns ok", async ({ page }) => {
    const response = await page.goto("/api/health");
    expect(response?.status()).toBe(200);
    const json = await response?.json();
    expect(json.status).toBe("ok");
    expect(json.db).toBe("ok");
  });

  test("robots.txt is served", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
  });

  test("sitemap.xml is served", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
  });
});

test.describe("Auth gating", () => {
  test("staff dashboard redirects to login", async ({ page }) => {
    await page.goto("/focus");
    await expect(page).toHaveURL(/\/login/);
  });

  test("patients list redirects to login", async ({ page }) => {
    await page.goto("/patients");
    await expect(page).toHaveURL(/\/login/);
  });

  test("patient home redirects to login", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/);
  });

  test("billing settings redirects to login", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(page).toHaveURL(/\/login/);
  });

  test("superadmin redirects to login", async ({ page }) => {
    await page.goto("/superadmin");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Security headers", () => {
  test("CSP header is set on main pages", async ({ page }) => {
    const response = await page.goto("/login");
    const csp = response?.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
  });

  test("HSTS header is set", async ({ page }) => {
    const response = await page.goto("/login");
    const hsts = response?.headers()["strict-transport-security"];
    expect(hsts).toBeTruthy();
  });

  test("X-Frame-Options is DENY on main pages", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.headers()["x-frame-options"]).toBe("DENY");
  });
});

test.describe("API self-auth", () => {
  test("billing checkout requires auth", async ({ request }) => {
    const res = await request.post("/api/billing/checkout", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403, 429, 503]).toContain(res.status());
  });

  test("AI soap requires auth", async ({ request }) => {
    const res = await request.post("/api/ai/soap", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403, 429, 503]).toContain(res.status());
  });

  test("assistant requires auth", async ({ request }) => {
    const res = await request.post("/api/assistant", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403, 429, 503]).toContain(res.status());
  });
});
