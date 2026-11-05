import { test, expect, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixtureCookie, fixtureOwner, fixtureOther } from "../scripts/workspace-fixture.mjs";
import { artifact } from "./artifacts";

test.skip(process.env.WORKSPACE_FIXTURE !== "true", "Requires the isolated loopback Auth/PostgREST fixture runner; never a live Supabase project.");
const origin = "http://127.0.0.1:3100";
async function signIn(context: BrowserContext, owner = fixtureOwner) {
  await context.addCookies([fixtureCookie(owner) as Parameters<BrowserContext["addCookies"]>[0][number]]);
  await context.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
}
test.beforeEach(async ({ context }) => { await signIn(context); });

test("SYNTHETIC provider: authenticated overview uses scoped real application queries and navigation", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Account Overview", exact: true })).toBeVisible();
  const metrics = page.getByRole("region", { name: "Your account at a glance" });
  await expect(metrics.getByRole("link", { name: /Total orders/ })).toContainText("17");
  await expect(metrics.getByRole("link", { name: /Saved drafts/ })).toContainText("3");
  await expect(metrics.getByRole("link", { name: /Published PDFs/ })).toContainText("3");
  await expect(page.getByRole("main")).not.toContainText("DT-OTHER-PRIVATE");
  await page.getByRole("navigation", { name: "Customer account" }).getByRole("link", { name: "Documents", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Documents", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3 documents", exact: true })).toBeVisible();
});

test("SYNTHETIC provider: order filters, reference search, sort, paging and reset keep private values out of URLs/storage", async ({ page }) => {
  await page.goto("/account/orders");
  await expect(page.getByRole("heading", { name: "17 orders", exact: true })).toBeVisible();
  await expect(page.locator(".desk-record")).toHaveCount(12);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await expect(page.locator(".desk-record")).toHaveCount(5);
  await page.getByLabel("Service", { exact: true }).selectOption("hotel");
  await page.getByLabel("Order status", { exact: true }).selectOption("paid");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("heading", { name: "5 orders", exact: true })).toBeVisible();
  await expect(page.locator(".desk-badge-wait")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("heading", { name: "17 orders", exact: true })).toBeVisible();
  await page.getByLabel("Sort by", { exact: true }).selectOption("oldest");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".desk-record").first()).toContainText("DT-WS-ONLY-017");
  await page.getByLabel("Order reference", { exact: true }).fill("DT-WS-ONLY-003");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".desk-record")).toHaveCount(1);
  await expect(page.locator(".desk-record")).toContainText("DT-WS-ONLY-003");
  await expect(page).toHaveURL(`${origin}/account/orders`);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  const response = await page.request.post("/api/account/workspace", { headers: { Origin: origin }, data: { view: "orders" } });
  expect(response.status()).toBe(200);
  expect(await response.text()).not.toMatch(/givenNames|dob|accountEmail|specialInstructions|booking_snapshot/);
  await page.getByRole("link", { name: "DT-WS-ONLY-003", exact: true }).click();
  await expect(page.getByRole("heading", { name: "DT-WS-ONLY-003", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Order progress", exact: true }).locator('[aria-current="step"]')).toHaveText(/Prepared/);
  await expect(page.getByRole("heading", { name: "Your documents", exact: true })).toBeVisible();
});

test("SYNTHETIC provider: saved drafts include legacy flights and resume through the existing booking endpoint", async ({ page }) => {
  await page.goto("/account/drafts");
  await expect(page.getByRole("heading", { name: "3 drafts", exact: true })).toBeVisible();
  await page.getByLabel("Service", { exact: true }).selectOption("flight");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("heading", { name: "1 draft", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Resume saved draft" }).click();
  await expect(page).toHaveURL(/\/book\?draft=[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Review", exact: true })).toBeVisible();
  await expect(page.getByLabel("I confirm that the passenger names and trip details are correct.")).not.toBeChecked();
  await page.getByRole("button", { name: "Edit trip details", exact: true }).click();
  await expect(page.getByLabel("From", { exact: true })).toHaveValue("New Delhi (DEL)");
});

test("SYNTHETIC provider: document library excludes unpublished/withdrawn/unpaid and separates customers", async ({ page, browser }) => {
  await page.goto("/account/documents");
  await expect(page.getByRole("heading", { name: "3 documents", exact: true })).toBeVisible();
  const pdfs = page.locator('a[href^="/api/documents/"]');
  await expect(pdfs).toHaveCount(3);
  expect(await pdfs.first().evaluate(element => parseFloat(getComputedStyle(element).borderTopWidth))).toBeGreaterThan(0);
  const ownHrefs = await pdfs.evaluateAll(links => links.map(link => link.getAttribute("href")));
  for (const suffix of ["304", "305", "306", "307", "308"]) expect(ownHrefs.some(href => href!.endsWith(suffix))).toBe(false);
  const other = await browser.newContext();
  try {
    await signIn(other, fixtureOther);
    const otherPage = await other.newPage(); await otherPage.goto(`${origin}/account/documents`);
    await expect(otherPage.getByRole("heading", { name: "1 document", exact: true })).toBeVisible();
    await expect(otherPage.getByRole("main")).toContainText("DT-OTHER-PRIVATE");
    const foreign = await otherPage.locator('a[href^="/api/documents/"]').getAttribute("href"); expect(ownHrefs).not.toContain(foreign);
  } finally { await other.close(); }
  const injected = await page.request.post("/api/account/workspace", { headers: { Origin: origin }, data: { view: "documents", owner_id: fixtureOther } }); expect(injected.status()).toBe(400);
});

test("SYNTHETIC provider: failed filters retry, session loss hides old data and no unsupported payment actions appear", async ({ page }) => {
  await page.goto("/account/orders");
  await expect(page.locator(".desk-record")).toHaveCount(12);
  let fail = true;
  await page.route("**/api/account/workspace", route => fail ? route.fulfill({ status: 503, json: { error: "Synthetic temporary failure" } }) : route.continue());
  await page.getByLabel("Service", { exact: true }).selectOption("hotel");
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Synthetic temporary failure");
  await expect(page.locator(".desk-record")).toHaveCount(0);
  fail = false; await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".desk-record")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "6 orders", exact: true })).toBeVisible();
  await expect(page.getByLabel("Service", { exact: true })).toHaveValue("hotel");
  await page.context().clearCookies();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Your session has ended");
  await expect(page.getByRole("link", { name: "Sign in again", exact: true })).toHaveAttribute("href", "/login?next=%2Faccount%2Forders");
  await expect(page.locator(".desk-record")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /mark.*paid|pay now|refund/i })).toHaveCount(0);
});

test("SYNTHETIC provider: marking an update read persists and preserves keyboard focus", async ({ page }) => {
  await page.goto("/account/notifications");
  await page.getByRole("button", { name: "Mark as read", exact: true }).click();
  await expect(page.getByText("Read in account", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as read", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Document published", exact: true })).toBeFocused();
  await page.getByRole("navigation", { name: "Customer account" }).getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByText("0 unread account updates", { exact: true })).toBeVisible();
});

test("SYNTHETIC provider: private screens are responsive, accessible and explain their no-JavaScript requirement", async ({ page, browser }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const route of ["/account", "/account/orders", "/account/drafts", "/account/documents", "/account/settings", "/account/help", "/account/notifications"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} at ${width}`).toBe(true); }
    await page.screenshot({ path: artifact(`workspace-${route.split("/").at(-1)}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations, route).toEqual([]);
    await page.screenshot({ path: artifact(`workspace-${route.split("/").at(-1)}-mobile.png`), fullPage: true });
    const enlarged = await page.addStyleTag({ content: "html { font-size: 200%; }" });
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} enlarged text at ${width}`).toBe(true);
      expect(await page.locator(".desk-nav > a").evaluateAll(links => links.every(link => link.scrollWidth <= link.clientWidth)), `${route} enlarged navigation at ${width}`).toBe(true);
    }
    if (route === "/account") {
      await page.screenshot({ path: artifact("workspace-overview-enlarged-text.png"), fullPage: true });
      const toggle = page.getByRole("button", { name: "Open navigation", exact: true });
      expect((await toggle.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      await toggle.click();
      const navigation = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
      expect(await navigation.evaluate(element => element.getBoundingClientRect().bottom <= innerHeight + 1)).toBe(true);
      await navigation.getByRole("link", { name: /Book dummy ticket/ }).scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Close navigation", exact: true }).click();
    }
    await enlarged.evaluate(element => element.parentNode?.removeChild(element));
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try { await signIn(noJs); const p = await noJs.newPage(); await p.goto(`${origin}/account/orders`); await expect(p.getByText(/Enable JavaScript to view your account details/)).toBeVisible(); await expect(p.getByRole("navigation", { name: "Customer account" })).toBeVisible(); await expect(p.getByRole("link", { name: "Booking help", exact: true })).toBeVisible(); } finally { await noJs.close(); }
  expect(errors).toEqual([]);
});
