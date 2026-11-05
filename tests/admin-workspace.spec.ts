import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixtureCookie, fixtureOther } from "../scripts/workspace-fixture.mjs";
import { fixturePdf, adminFixtureSecret } from "../scripts/admin-fixture.mjs";
import { artifact } from "./artifacts";
test.skip(process.env.ADMIN_WORKSPACE_FIXTURE !== "true", "Requires disposable PostgreSQL and loopback Auth/Storage; never run against hosted accounts.");
const origin = "http://127.0.0.1:3100", paid = process.env.ADMIN_FIXTURE_PAID_ORDER!, pending = process.env.ADMIN_FIXTURE_PENDING_ORDER!, unpaid = process.env.ADMIN_FIXTURE_UNPAID_ORDER!;
async function signIn(context: BrowserContext, owner?: string) { await context.addCookies([fixtureCookie(owner) as Parameters<BrowserContext["addCookies"]>[0][number]]); await context.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort()); }
test.beforeEach(async ({ context }) => { await signIn(context); });
async function save(page: Page) { await page.getByRole("button", { name: "Save draft", exact: true }).first().click(); await expect(page.getByRole("status").filter({ hasText: "Draft saved." })).toBeVisible(); }
async function publish(page: Page) { await page.getByRole("button", { name: "Review publication", exact: true }).click(); await page.getByLabel("I have reviewed this saved revision and approve this change.").check(); await page.getByRole("button", { name: "Publish saved revision", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Published." })).toBeVisible(); }
async function openSection(page: Page, id: string) { const detail = page.locator(id); if (!await detail.evaluate(element => (element as HTMLDetailsElement).open)) await detail.locator(":scope > summary").click(); }

test("LOCAL PostgreSQL: staff dashboard, paid queues, order filters and pagination", async ({ page }) => {
  await page.goto("/admin"); await expect(page.getByRole("heading", { name: "Operations Overview", exact: true })).toBeVisible();
  const totals = page.getByRole("region", { name: "Operational totals" }); await expect(totals.getByRole("link", { name: /Total orders/ })).toContainText("23"); await expect(totals.getByRole("link", { name: /Awaiting payment/ })).toContainText("18");
  await expect(page.getByRole("navigation", { name: "Staff navigation" }).getByRole("link")).toHaveCount(8);
  await expect(page.locator(".ops-queue > a")).toHaveCount(5);
  await expect(page.getByRole("button", { name: /mark.*paid|payment success/i })).toHaveCount(0);
  await page.goto("/admin/orders"); await expect(page.locator(".ops-order-record")).toHaveCount(20);
  await page.getByRole("link", { name: "Next page", exact: true }).click(); await expect(page.locator(".ops-order-record")).toHaveCount(3);
  await page.goto("/admin/orders?service=hotel&payment=paid&sort=oldest"); await expect(page.locator(".ops-order-record")).toHaveCount(2); await expect(page.locator(".ops-order-record").first()).toContainText("DT-ADMIN-ONLY-005");
  await page.goto("/admin/orders?page=9999"); await expect(page).toHaveURL(/page=2/); await expect(page.locator(".ops-order-record")).toHaveCount(3);
});

test("LOCAL admin navigation: grouped sections, command search, breadcrumbs and order filters", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin");
  await expect(page.getByRole("main")).not.toContainText('<details class="ops-static-nav">', { useInnerText: true });
  const nav = page.getByRole("navigation", { name: "Staff navigation", exact: true });
  for (const group of ["Workspace", "Reservations", "Website & business", "Monitoring"]) await expect(nav.getByText(group, { exact: true })).toBeVisible();
  const launch = page.getByRole("button", { name: /Jump to section/ });
  await launch.click();
  const search = page.getByRole("dialog", { name: "Jump to a Section", exact: true });
  const input = search.getByRole("searchbox", { name: "Search admin sections" });
  await expect(input).toBeFocused(); await input.fill("pricing");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: artifact("admin-command-search-desktop.png") });
  await input.press("ArrowDown"); await expect(search.getByRole("link", { name: /Service pricing/ })).toBeFocused();
  await page.keyboard.press("Enter"); await expect(page).toHaveURL(/\/admin\/editor\/pricing--catalog$/); await expect(search).not.toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin breadcrumbs" })).toContainText("Service pricing");
  await expect(page.getByRole("navigation", { name: "Staff navigation", exact: true }).getByRole("link", { name: "Service pricing", exact: true })).toHaveAttribute("aria-current", "page");
  await launch.click(); await input.fill("no-such-admin-section"); await expect(search.getByText(/No matching section/)).toBeVisible();
  await page.keyboard.press("Escape"); await expect(search).not.toBeVisible(); await expect(launch).toBeFocused();
  await page.keyboard.press("Control+k"); await expect(search).toBeVisible(); await page.keyboard.press("Escape");
  const fee = page.getByLabel("One-way / return flight fee (INR)", { exact: true }), originalFee = await fee.inputValue();
  await fee.fill(String(Number(originalFee) + 1)); await launch.click(); await input.fill("customer");
  page.once("dialog", dialog => dialog.dismiss()); await search.getByRole("link", { name: /Customers/ }).click();
  await expect(page).toHaveURL(/\/admin\/editor\/pricing--catalog$/); await expect(search).toBeVisible(); await page.keyboard.press("Escape"); await expect(fee).toHaveValue(String(Number(originalFee) + 1)); await fee.fill(originalFee);
  await nav.getByRole("link", { name: "Content", exact: true }).click();
  await page.getByRole("navigation", { name: "Related admin sections" }).getByRole("link", { name: "Guides", exact: true }).click();
  await expect(page).toHaveURL(/kind=guide/); await expect(page.getByRole("navigation", { name: "Related admin sections" }).getByRole("link", { name: "Guides", exact: true })).toHaveAttribute("aria-current", "page");
  await page.goto(`/admin/orders/${paid}`);
  const breadcrumbs = page.getByRole("navigation", { name: "Admin breadcrumbs" }); await expect(breadcrumbs).toContainText("Order details"); await expect(breadcrumbs).not.toContainText(paid);
  await breadcrumbs.getByRole("link", { name: "Orders", exact: true }).click();
  await page.getByLabel("Service", { exact: true }).selectOption("hotel"); await page.getByLabel("Payment", { exact: true }).selectOption("paid"); await page.getByLabel("Sort by", { exact: true }).selectOption("oldest"); await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page.locator(".ops-order-record")).toHaveCount(2); await expect(page.locator(".ops-order-record").first()).toContainText("DT-ADMIN-ONLY-005");
  await page.getByText("Filter & sort orders", { exact: true }).click(); await expect(page.getByLabel("Service", { exact: true })).not.toBeVisible();
});

test("LOCAL mobile navigation: modal focus, keyboard search, dismissal and resizing", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/admin");
  const trigger = page.locator(".ops-mobile-menu"), drawer = page.getByRole("dialog", { name: "Navigation", exact: true });
  await trigger.click(); await expect(drawer).toBeVisible(); await expect(page.getByRole("button", { name: "Close admin navigation" })).toBeFocused();
  await page.screenshot({ path: artifact("admin-navigation-mobile.png") });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Shift+Tab"); expect(await drawer.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape"); await expect(drawer).not.toBeVisible(); await expect(trigger).toBeFocused();
  await trigger.click(); await drawer.getByRole("link", { name: "Documents", exact: true }).click(); await expect(page).toHaveURL(/\/admin\/documents$/); await expect(drawer).not.toBeVisible();
  await page.getByRole("button", { name: "Search admin sections", exact: true }).click();
  const search = page.getByRole("dialog", { name: "Jump to a Section", exact: true });
  await search.getByRole("searchbox").fill("faq"); await search.getByRole("link", { name: /Pages & FAQs/ }).click(); await expect(page).toHaveURL(/\/admin\/content\?kind=page$/); await expect(search).not.toBeVisible();
  await trigger.click(); await page.keyboard.press("Control+k"); await expect(search).toBeVisible(); await expect(drawer).not.toBeVisible(); await page.keyboard.press("Escape");
  await trigger.click(); await page.mouse.click(389, 840); await expect(drawer).not.toBeVisible();
  await trigger.click(); await page.setViewportSize({ width: 1440, height: 1000 }); await expect(drawer).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await expect(page.getByRole("navigation", { name: "Staff navigation", exact: true })).toBeVisible();
});

test("LOCAL PostgreSQL: customer directory search stays private and links to owner orders", async ({ page }) => {
  await page.goto("/admin/customers"); await expect(page.getByRole("heading", { name: "Customers", exact: true })).toBeVisible();
  await expect(page.locator(".ops-library-card")).toHaveCount(1); await expect(page.locator(".ops-library-card")).toContainText("23 orders");
  await page.getByLabel("Account email search").fill("no-match@example.test"); await page.getByRole("button", { name: "Find customers" }).click(); await expect(page.getByRole("heading", { name: "No matching customer orders" })).toBeVisible(); expect(page.url()).not.toContain("example");
  await page.getByRole("button", { name: "Reset", exact: true }).click(); await expect(page.locator(".ops-library-card")).toHaveCount(1); await page.getByRole("link", { name: "View customer orders" }).click(); await expect(page.getByRole("heading", { name: "Customer Orders", exact: true })).toBeVisible(); expect(new URL(page.url()).pathname).toBe(`/admin/customers/${fixtureOther}`);
  await expect(page.locator(".ops-library-card:visible")).toHaveCount(20);
});

test("LOCAL PostgreSQL: settings and pricing publish into public HTML and the real order API", async ({ page, browser }) => {
  test.setTimeout(120000);
  await page.goto("/admin/editor/settings--site"); await page.getByLabel("Homepage heading", { exact: true }).fill("Travel Documents, Managed With Care"); await page.getByLabel("Approved support email", { exact: true }).fill("support@example.test"); await save(page);
  expect(await (await page.request.get("/")).text()).not.toContain("Travel Documents, Managed With Care");
  await publish(page);
  await expect.poll(async () => (await (await page.request.get("/")).text()).includes("Travel Documents, Managed With Care"), { timeout: 15000 }).toBe(true);
  await page.goto("/"); await expect(page.getByRole("heading", { level: 1 })).toContainText("Travel Documents, Managed With Care"); expect(await page.content()).not.toContain(adminFixtureSecret);
  await page.goto("/contact"); await expect(page.getByRole("main").getByRole("link", { name: "support@example.test", exact: true })).toBeVisible(); await expect(page.getByRole("main")).not.toContainText("Direct email and telephone support are currently unavailable");
  await page.goto("/admin/editor/pricing--catalog"); await page.getByLabel("One-way / return flight fee (INR)", { exact: true }).fill("899"); await page.getByLabel("Multi-city flight fee (INR)", { exact: true }).fill("1299"); await page.getByLabel("Hotel fee per traveller / stay (INR)", { exact: true }).fill("799"); await save(page); await publish(page);
  await page.goto("/pricing"); await expect(page.getByRole("main")).toContainText("₹899"); await expect(page.getByRole("main")).toContainText("₹1,499"); await expect(page.getByRole("main")).not.toContainText("{{");
  await page.getByLabel("Document service", { exact: true }).selectOption("hotel"); await expect(page.locator(".estimate-result")).toContainText("₹799");
  const customer = await browser.newContext();
  try {
    await signIn(customer, fixtureOther); const customerPage = await customer.newPage(); await customerPage.goto("/account");
    const draft = { service: "flight", trip: { type: "one-way", sectors: [{ from: "New Delhi", to: "Paris", departure: "2099-06-15" }], returnDate: "" }, hotels: [], passengers: [{ givenNames: "Synthetic", surname: "Price Review", singleName: false, dob: "1990-01-01", sex: "F", nationality: "" }], communication: { accountEmail: "workspace-other@example.test", channel: "email", whatsapp: "", alternateContact: "", purpose: "", appointmentDate: "", specialInstructions: "SYNTHETIC LOCAL PRICE TEST ONLY" }, confirmations: { detailsCorrect: true, termsAccepted: true } };
    const id = crypto.randomUUID();
    const saved = await customerPage.request.post("/api/bookings", { headers: { Origin: origin }, data: { action: "save", id, revision: 0, booking: draft } }); expect(saved.status()).toBe(200);
    const params = { action: "order", id, revision: 1, idempotencyKey: crypto.randomUUID(), expectedUnitPriceMinor: 69900, expectedPolicyVersion: "preview-2026-10-22" };
    const stale = await customerPage.request.post("/api/bookings", { headers: { Origin: origin }, data: params }); expect(stale.status()).toBe(409);
    const fresh = await customerPage.request.post("/api/bookings", { headers: { Origin: origin }, data: { ...params, expectedUnitPriceMinor: 89900 } }); expect(fresh.status()).toBe(200);
    const order = await fresh.json(); await customerPage.goto(`/account/orders/${order.orderId}`); await expect(customerPage.getByRole("main")).toContainText("₹899"); await expect(customerPage.getByRole("main")).toContainText("Awaiting payment");
    await customerPage.goto(`/account/orders/${paid}`); await expect(customerPage.getByRole("main")).toContainText("₹699");
  } finally { await customer.close(); }
  const noJs = await browser.newContext({ javaScriptEnabled: false }); try { const p = await noJs.newPage(); await p.goto(origin); await expect(p.getByRole("heading", { level: 1 })).toContainText("Travel Documents, Managed With Care"); await expect(p.getByText("support@example.test", { exact: true })).toBeVisible(); } finally { await noJs.close(); }
});

test("LOCAL PostgreSQL: content draft, preview, publication, stale-tab conflict and restore", async ({ page, context }) => {
  test.setTimeout(120000);
  await page.goto("/admin/editor/page--faq"); await page.getByLabel("Page title / H1", { exact: true }).fill("Questions About Dummy Reservations"); await openSection(page, "#cms-faqs"); await page.locator("#cms-faqs-0-question").fill("How can I track my reservation request?"); await page.locator("#cms-faqs-0-answer").fill("Sign in to your account to view your saved requests, current order status and published documents."); await save(page);
  expect(await (await page.request.get("/faq")).text()).not.toContain("Questions About Dummy Reservations");
  const popupPromise = context.waitForEvent("page"); await page.getByRole("link", { name: "Preview saved draft" }).click(); const preview = await popupPromise; await expect(preview.getByRole("heading", { name: "Draft Content Preview", exact: true })).toBeVisible(); await expect(preview.getByRole("heading", { name: "Questions About Dummy Reservations", exact: true })).toBeVisible(); await preview.close();
  await publish(page);
  const stale = await context.newPage(); await stale.goto("/admin/editor/page--faq"); await page.getByLabel("Page title / H1", { exact: true }).fill("A Private Revised FAQ Draft"); await save(page);
  await stale.getByLabel("Page title / H1", { exact: true }).fill("Another Tab Draft"); await stale.getByRole("button", { name: "Save draft", exact: true }).first().click(); await expect(stale.getByRole("main").getByRole("alert")).toContainText("changed in another tab"); await expect(stale.getByLabel("Page title / H1", { exact: true })).toHaveValue("Another Tab Draft"); await stale.close();
  await page.getByRole("button", { name: "Revision history", exact: true }).click(); await page.locator(".ops-history li").filter({ hasText: "Revision 1 · save" }).getByRole("button", { name: "Restore as draft" }).click(); await expect(page.getByRole("status").filter({ hasText: "Revision restored" })).toBeVisible(); await page.getByRole("button", { name: "Content", exact: true }).click(); await expect(page.getByLabel("Page title / H1", { exact: true })).toHaveValue("Questions About Dummy Reservations");
  const response = await page.request.get("/faq"); const html = await response.text(); expect(html).toContain("Questions About Dummy Reservations"); expect(html).not.toContain("A Private Revised FAQ Draft");
  await page.goto("/faq"); await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Questions About Dummy Reservations | DummyTicket"); await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://dummyticketonward.com/faq");
});

test("LOCAL PostgreSQL: a new guide publishes to its route and sitemap, withdraws and restores", async ({ page, browser }) => {
  test.setTimeout(120000);
  await page.goto("/admin/content/new"); await page.getByLabel("URL slug", { exact: true }).fill("synthetic-admin-guide"); await page.getByRole("button", { name: "Open new draft" }).click(); await page.getByLabel("Page title / H1", { exact: true }).fill("Synthetic Reservation Planning Guide"); await page.getByLabel("Page introduction", { exact: true }).fill("A useful synthetic article for this local integration run only."); await page.getByLabel("Article excerpt", { exact: true }).fill("A clearly labelled isolated article excerpt."); await openSection(page, "#cms-sections"); await page.locator("#cms-sections-0-heading").fill("Review your request"); await openSection(page, "#cms-sections-0-paragraphs"); await page.locator("#cms-sections-0-paragraphs-0").fill("Check names, dates and the selected document service before creating an order. This synthetic article is not travel advice.");
  await page.getByRole("button", { name: "Search & links", exact: true }).click(); await page.getByLabel("Search description", { exact: true }).fill("Synthetic local planning guide metadata for an isolated integration run."); await page.getByLabel("Keep page provisional / noindex").uncheck(); await save(page);
  expect((await page.request.get("/guides/synthetic-admin-guide")).status()).toBe(404);
  await publish(page);
  const published = await page.request.get("/guides/synthetic-admin-guide"); expect(published.status()).toBe(200); expect(await published.text()).toContain("Synthetic Reservation Planning Guide"); expect(await (await page.request.get("/sitemap.xml")).text()).toContain("/guides/synthetic-admin-guide");
  const noJs = await browser.newContext({ javaScriptEnabled: false }); try { const p = await noJs.newPage(); const result = await p.goto(`${origin}/guides/synthetic-admin-guide`); expect(result?.status()).toBe(200); await expect(p.getByRole("heading", { name: "Synthetic Reservation Planning Guide", exact: true })).toBeVisible(); } finally { await noJs.close(); }
  await page.getByRole("button", { name: "Withdraw article", exact: true }).click(); await page.getByLabel("I have reviewed this saved revision and approve this change.").check(); await page.getByRole("button", { name: "Confirm withdrawal", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Article withdrawn" })).toBeVisible(); expect((await page.request.get("/guides/synthetic-admin-guide")).status()).toBe(404); expect(await (await page.request.get("/sitemap.xml")).text()).not.toContain("/guides/synthetic-admin-guide");
  await page.getByRole("button", { name: "Revision history", exact: true }).click(); await page.locator(".ops-history li").filter({ hasText: "Revision 2 · publish" }).getByRole("button", { name: "Restore as draft" }).click(); await expect(page.getByRole("status").filter({ hasText: "Revision restored" })).toBeVisible(); expect((await page.request.get("/guides/synthetic-admin-guide")).status()).toBe(404); await publish(page); expect((await page.request.get("/guides/synthetic-admin-guide")).status()).toBe(200);
});

test("LOCAL PostgreSQL + synthetic Storage: PDF upload/review/publish/withdraw and pending recovery obey payment guards", async ({ page, browser }) => {
  test.setTimeout(120000);
  await page.goto(`/admin/orders/${paid}`); await page.getByRole("button", { name: "Start processing", exact: true }).click(); await expect(page.getByRole("button", { name: "Start processing", exact: true })).toHaveCount(0);
  await page.getByLabel("New PDF version (maximum 10 MB)").setInputFiles({ name: "synthetic-admin-only.pdf", mimeType: "application/pdf", buffer: fixturePdf }); await page.getByRole("button", { name: "Upload private PDF", exact: true }).click(); await expect(page.getByText("Private — not published", { exact: true })).toBeVisible();
  const href = await page.getByRole("link", { name: "Download for review", exact: true }).getAttribute("href"); expect(href).toMatch(/^\/api\/documents\//); const review = await page.request.get(href!); expect(review.status()).toBe(200); expect(await review.body()).toEqual(fixturePdf);
  await page.getByRole("button", { name: "Publish version 1", exact: true }).click(); await page.getByLabel("I have reviewed this order and document version.").check(); await page.getByRole("button", { name: "Confirm publication", exact: true }).click(); await expect(page.getByText("Published on customer dashboard", { exact: true })).toBeVisible();
  const customer = await browser.newContext(); try { await signIn(customer, fixtureOther); const download = await customer.request.get(`${origin}${href}`); expect(download.status()).toBe(200); expect(download.headers()["cache-control"]).toContain("no-store"); expect(await download.body()).toEqual(fixturePdf); await page.getByRole("button", { name: "Withdraw version 1", exact: true }).click(); await page.getByLabel("I have reviewed this order and document version.").check(); await page.getByRole("button", { name: "Confirm withdrawal", exact: true }).click(); await expect(page.getByText("Withdrawn from customer downloads", { exact: true })).toBeVisible(); expect((await customer.request.get(`${origin}${href}`)).status()).toBe(404); } finally { await customer.close(); }
  await page.goto(`/admin/orders/${unpaid}`); await expect(page.getByRole("button", { name: "Upload private PDF", exact: true })).toBeDisabled(); expect((await page.request.post(`/api/admin/orders/${unpaid}`, { headers: { Origin: origin }, data: { action: "start" } })).status()).toBe(409); expect((await page.request.post(`/api/admin/orders/${unpaid}`, { headers: { Origin: origin }, data: { action: "paid" } })).status()).toBe(400);
  await page.goto(`/admin/orders/${pending}`); await page.getByRole("button", { name: "Retry confirmation for version 1", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Action unavailable" })).toBeVisible(); await page.getByRole("button", { name: "Abandon pending version 1", exact: true }).click(); await page.getByLabel("I have reviewed this order and document version.").check(); await page.getByRole("button", { name: "Confirm abandonment", exact: true }).click(); await expect(page.getByText("Upload failed — upload a new version.", { exact: true })).toBeVisible();
});

test("LOCAL staff screens: responsive layouts, enlarged text, private no-JavaScript guidance and automated accessibility", async ({ page, browser }) => {
  test.setTimeout(240000);
  const routes = ["/admin", "/admin/orders", "/admin/documents", "/admin/customers", "/admin/content", "/admin/settings", "/admin/activity", "/admin/notifications", "/admin/editor/settings--site", "/admin/editor/pricing--catalog", "/admin/editor/page--faq", `/admin/orders/${paid}`];
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const route of routes) {
    await page.goto(route); await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} ${width}`).toBe(true); }
    await page.screenshot({ path: artifact(`admin-${route.split("/").at(-1)}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations, route).toEqual([]); await page.screenshot({ path: artifact(`admin-${route.split("/").at(-1)}-mobile.png`), fullPage: true });
    const enlarged = await page.addStyleTag({ content: "html { font-size: 200%; }" }); for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} enlarged ${width}`).toBe(true); } await enlarged.evaluate(node => node.parentNode?.removeChild(node));
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false }); try { await signIn(noJs); const p = await noJs.newPage(); await p.goto(`${origin}/admin`); await expect(p.getByText(/Enable JavaScript to view private staff records/)).toBeVisible(); await p.getByText("Admin navigation", { exact: true }).click(); await expect(p.getByRole("navigation", { name: "Staff navigation without JavaScript", exact: true })).toBeVisible(); await p.setViewportSize({ width: 390, height: 844 }); await expect(p.getByRole("navigation", { name: "Staff navigation without JavaScript", exact: true })).toBeVisible(); expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); } finally { await noJs.close(); }
  expect(errors).toEqual([]);
});

test("LOCAL authorization: customer and revoked staff cannot access management or document operations", async ({ page, browser }) => {
  const customer = await browser.newContext(); try { await signIn(customer, fixtureOther); const p = await customer.newPage(); await p.goto(`${origin}/admin/content`); await expect(p.getByRole("heading", { name: "Staff Access Required", exact: true })).toBeVisible(); for (const endpoint of ["/api/admin/site", "/api/admin/customers"]) { const response = await p.request.post(`${origin}${endpoint}`, { headers: { Origin: origin }, data: { key: "settings:site", action: "save", revision: 0, payload: {} } }); expect(response.status()).toBe(403); } } finally { await customer.close(); }
  const denied = await page.request.post("/api/admin/site", { headers: { Origin: "https://evil.test" }, data: { key: "settings:site", action: "save", revision: 0 } }); expect(denied.status()).toBe(403);
  await page.request.post("http://127.0.0.1:3211/__fixture/revoke-staff"); await page.goto("/admin/orders"); await expect(page.getByRole("heading", { name: "Staff Access Required", exact: true })).toBeVisible(); await expect(page.locator(".ops-order-record")).toHaveCount(0);
  const revoked = await page.request.post("/api/admin/site", { headers: { Origin: origin }, data: { key: "settings:site", action: "publish", revision: 2, confirmed: true } }); expect(revoked.status()).toBe(403); expect(revoked.headers()["cache-control"]).toContain("no-store");
});
