import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { safeAdminReturnPath, safeCustomerReturnPath } from "../src/lib/account";

test("login return paths stay in their own workspace and reject redirect injection", () => {
  for (const value of [null, "https://evil.test", "//evil.test", "/admin-login", "/admin/../account", "/admin?next=https://evil.test", "/admin/orders?email=private@example.test", "/%61dmin"]) {
    expect(safeAdminReturnPath(value)).toBe("/admin");
    expect(safeCustomerReturnPath(value)).toBe("/account/orders");
  }
  const order = "/admin/orders/11111111-1111-4111-8111-111111111111";
  expect(safeAdminReturnPath(order)).toBe(order);
  expect(safeAdminReturnPath("/admin/editor/settings--site/preview")).toBe("/admin/editor/settings--site/preview");
  expect(safeCustomerReturnPath(order)).toBe("/account/orders");
  expect(safeCustomerReturnPath("/book")).toBe("/book");
  expect(safeAdminReturnPath("/account/orders")).toBe("/admin");
});

test("separate admin entry is private, mobile accessible and absent from public navigation", async ({ page, request }) => {
  const response = await page.goto("/admin-login");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByRole("heading", { level: 1, name: "Admin Sign-In", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Admin sign-in is unavailable" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Staff navigation", exact: true })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  for (const path of ["/", "/login", "/pricing"]) {
    await page.goto(path);
    await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  }
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/admin-login");
  const denied = await request.post("/api/staff-auth/send", { headers: { Origin: "https://evil.test" }, data: { email: "synthetic@example.test" } });
  expect(denied.status()).toBe(403);
});

test("MOCKED customer entry cannot redirect an existing customer into admin", async ({ page }) => {
  await page.route("**/api/auth/session", route => route.fulfill({ json: { configured: true, user: { id: "11111111-1111-4111-8111-111111111111", email: "synthetic@example.test" }, otpLength: 6 } }));
  await page.goto("/login?next=%2Fadmin%2Forders");
  await expect(page.getByRole("link", { name: "Continue to your account", exact: true })).toHaveAttribute("href", "/account/orders");
});
