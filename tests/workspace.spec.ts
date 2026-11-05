import { test, expect } from "@playwright/test";
import { workspaceQuery } from "../src/lib/workspace";
import { safeReturnPath } from "../src/lib/account";

test("workspace filters reject identity injection, malformed references and unsupported operations", () => {
  for (const input of [{ view: "orders", owner_id: "other-owner" }, { view: "documents", payment: "paid" }, { view: "orders", page: -1 }, { view: "orders", reference: "test@example.test" }, { view: "orders", reference: "%_" }, { view: "drafts", reference: "DT-1" }, { view: "documents", status: "paid" }, { view: "orders", sort: "raw_sql" }, { view: "delete" }]) expect(workspaceQuery.safeParse(input).success).toBe(false);
  for (const path of ["/account", "/account/drafts", "/account/documents", "/account/settings", "/account/help"]) { expect(safeReturnPath(path)).toBe(path); expect(safeReturnPath(`${path}?email=private@example.test`)).toBe("/account/orders"); }
});
test("new account routes and API keep private cache/index rules and fail closed", async ({ page, request }) => {
  for (const route of ["/account", "/account/drafts", "/account/documents", "/account/settings", "/account/help"]) {
    const response = await page.goto(route);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await expect(page.getByRole("heading", { name: "Account services are unavailable" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Customer account" }).locator('[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('a[href^="/api/documents/"]')).toHaveCount(0);
  }
  const cross = await request.post("/api/account/workspace", { headers: { Origin: "https://untrusted.example" }, data: { view: "orders" } });
  expect(cross.status()).toBe(403);
  for (const view of ["orders", "drafts", "documents"]) {
    const response = await request.post("/api/account/workspace", { headers: { Origin: "http://127.0.0.1:3100" }, data: { view } });
    expect(response.status()).toBe(503); expect(response.headers()["cache-control"]).toContain("no-store"); expect(response.headers()["x-robots-tag"]).toContain("noindex");
  }
  expect((await request.post("/api/account/workspace", { headers: { Origin: "http://127.0.0.1:3100" }, data: { view: "orders", owner_id: "forged" } })).status()).toBe(400);
  expect((await request.get("/api/account/workspace")).status()).toBe(405);
});
