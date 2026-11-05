import { test, expect } from "@playwright/test";
import { managementKey, parsePriceInput, payloadSchema, pricingSchema, siteMutation } from "../src/lib/site-management";
import { editorialToday } from "../src/lib/site-runtime";
import { adminDestinationMatches, adminLocation } from "../src/lib/admin-navigation";

test("admin location keeps record identities out of breadcrumbs and distinguishes editor/collection destinations", () => {
  const id = "f9000000-0000-4000-8000-000000000001";
  const customer = adminLocation(`/admin/customers/${id}`);
  expect(customer.detail).toBe("Customer history"); expect(JSON.stringify(customer)).not.toContain(id);
  expect(adminLocation("/admin/editor/pricing--catalog").module.href).toBe("/admin/settings");
  expect(adminLocation("/admin/editor/page--faq/preview")).toMatchObject({ preview: true, detail: "Content editor", module: { href: "/admin/content" } });
  expect(adminDestinationMatches("/admin/content", new URLSearchParams("kind=guide"), "/admin/content?kind=guide")).toBe(true);
  expect(adminDestinationMatches("/admin/content", new URLSearchParams("kind=page"), "/admin/content?kind=guide")).toBe(false);
  expect(adminDestinationMatches("/admin/settings", new URLSearchParams("kind=guide"), "/admin/content?kind=guide")).toBe(false);
});
test("management contracts reject unsafe money, links, identity injection and use the business review date", () => {
  expect(parsePriceInput("699.99")).toBe(69999);
  for (const invalid of ["6e2", "-1", "1.001", "NaN"]) expect(parsePriceInput(invalid)).toBeNull();
  expect(pricingSchema.safeParse({ standardFlightMinor: 69900, multiCityMinor: 99900, hotelMinor: 69900, comboDiscountMinor: 139800 }).success).toBe(false);
  expect(siteMutation.safeParse({ key: "settings:site", action: "save", revision: 0, owner_id: crypto.randomUUID() }).success).toBe(false);
  expect(managementKey.safeParse("settings:server-secrets").success).toBe(false);
  expect(payloadSchema("settings:site").safeParse({ SUPABASE_SECRET_KEY: "invalid-test-field" }).success).toBe(false);
  expect(editorialToday(new Date("2026-11-04T20:00:00.000Z"))).toBe("2026-11-05");
  expect(editorialToday(new Date("2026-11-04T18:00:00.000Z"))).toBe("2026-11-04");
});
test("new management pages/APIs remain private and fail closed without a provider", async ({ page, request }) => {
  for (const path of ["/admin/documents", "/admin/customers", "/admin/content", "/admin/content/new", "/admin/settings", "/admin/activity", "/admin/editor/page--faq", "/admin/editor/page--faq/preview"]) {
    const response = await page.goto(path); expect(response?.headers()["cache-control"]).toContain("no-store"); await expect(page.getByRole("heading", { name: "Admin Services Unavailable", exact: true })).toBeVisible(); await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow"); await expect(page.getByRole("button", { name: "Publish saved revision", exact: true })).toHaveCount(0);
  }
  for (const endpoint of ["/api/admin/site", "/api/admin/customers"]) {
    const response = await request.post(endpoint, { headers: { Origin: "http://127.0.0.1:3100" }, data: { action: "save", key: "settings:site", revision: 0 } }); expect(response.status()).toBe(403); expect(response.headers()["cache-control"]).toContain("no-store"); expect((await request.post(endpoint, { headers: { Origin: "https://evil.test" }, data: {} })).status()).toBe(403); expect((await request.get(endpoint)).status()).toBe(405);
  }
});
