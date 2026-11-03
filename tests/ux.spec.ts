import { artifact } from "./artifacts";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("fee estimate covers real pricing boundaries and carries only service choices to booking", async ({ page }) => {
  await page.goto("/pricing");
  const total = page.getByTestId("estimated-fee");
  await expect(total).toContainText("₹699");
  await page.getByLabel("Document service").selectOption("combo");
  await page.getByLabel("Travellers", { exact: true }).selectOption("2");
  await expect(total).toContainText("₹2,398");
  await page.getByLabel("Hotel stays").selectOption("2");
  await expect(total).toContainText("₹3,796");
  await page.getByLabel("Flight trip type").selectOption("multi-city");
  await expect(total).toContainText("₹4,396");
  await page.getByLabel("Travellers", { exact: true }).selectOption("6");
  await page.getByLabel("Hotel stays").selectOption("4");
  await expect(total).toContainText("₹21,576");
  await page.getByLabel("Document service").selectOption("hotel");
  await expect(page.getByLabel("Flight trip type")).toHaveCount(0);
  await expect(total).toContainText("₹16,776");
  await expect(page.getByRole("link", { name: "Start this request" })).toHaveAttribute("href", "/book?service=hotel");
  await page.getByLabel("Document service").selectOption("flight");
  await expect(page.getByLabel("Hotel stays")).toHaveCount(0);
  await expect(total).toContainText("₹5,994");
  await page.getByRole("link", { name: "Start this request" }).click();
  await expect(page).toHaveURL(/\/book\?service=flight&type=multi-city$/);
  await expect(page.getByRole("group", { name: "Sector 2", exact: true })).toBeVisible();
});

test("mobile navigation identifies location, closes on blur/outside/resize and stays reachable in landscape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing");
  const toggle = page.getByRole("button", { name: /navigation/ });
  const menu = page.getByRole("navigation", { name: "Mobile navigation" });
  await toggle.click();
  await expect(menu.getByRole("link", { name: "Pricing", exact: true })).toHaveAttribute("aria-current", "page");
  await page.mouse.click(8, 800); await expect(menu).not.toBeVisible();
  await toggle.click();
  await menu.getByRole("link", { name: "Book Dummy Ticket", exact: false }).focus();
  await page.keyboard.press("Tab"); await expect(menu).not.toBeVisible();
  await toggle.click(); await page.setViewportSize({ width: 1440, height: 900 }); await page.setViewportSize({ width: 390, height: 844 }); await expect(menu).not.toBeVisible();
  await page.setViewportSize({ width: 667, height: 320 }); await toggle.click();
  const booking = menu.getByRole("link", { name: "Book Dummy Ticket", exact: false });
  await booking.scrollIntoViewIfNeeded();
  expect(await booking.evaluate(element => { const rect = element.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; })).toBe(true);
  await page.keyboard.press("Escape"); await expect(toggle).toBeFocused();
  await page.goto("/guides/check-your-document-requirements"); await toggle.click();
  await expect(menu.getByRole("link", { name: "Guides", exact: true })).toHaveAttribute("aria-current", "page");
});

test("footer touch targets, complete page contents and contextual help actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/pricing");
  const metrics = await page.locator(".public-footer .footer-grid a:not(.brand)").evaluateAll(links => links.map(link => ({ height: link.getBoundingClientRect().height, font: parseFloat(getComputedStyle(link).fontSize) })));
  expect(metrics.length).toBeGreaterThan(10);
  expect(metrics.every(item => item.height >= 44 && item.font >= 14)).toBe(true);
  const contents = page.locator(".mobile-contents"); await expect(contents).not.toHaveAttribute("open", "");
  await contents.locator("summary").click();
  await contents.getByRole("link", { name: "Compare service fees", exact: true }).click();
  await expect(page).toHaveURL(/#service-fees$/);
  expect(await page.locator("#service-fees").evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(72);
  await page.goto("/contact"); await expect(page.locator(".editorial-cta a")).toHaveAttribute("href", "/account/orders");
  await page.goto("/privacy"); await expect(page.locator(".editorial-cta a")).toHaveAttribute("href", "/dummy-ticket");
});

test("public interaction works without JavaScript without misleading calculator controls", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/pricing");
  const navigation = page.getByRole("navigation", { name: "Navigation without JavaScript" });
  await expect(navigation).toBeVisible(); await expect(page.getByRole("button", { name: "Open navigation" })).not.toBeVisible();
  await expect(page.locator(".estimate-fields")).not.toBeVisible();
  await expect(page.locator(".fee-comparison")).toContainText("₹1,499");
  await page.locator(".mobile-contents summary").click(); await expect(page.locator(".mobile-contents")).toHaveAttribute("open", "");
  await navigation.getByRole("link", { name: "Guides", exact: true }).click(); await expect(page.locator("h1")).toContainText("planning guides");
  await context.close();
});

test("customer and staff skip links move keyboard focus to content", async ({ page }) => {
  for (const route of ["/account/orders", "/admin", "/admin/orders"]) {
    await page.goto(route); await page.keyboard.press("Tab"); await expect(page.locator(".skip-link")).toBeFocused(); await page.keyboard.press("Enter"); await expect(page.locator("#main-content")).toBeFocused();
  }
});

test("compact-width, enlarged-text and estimator accessibility checks", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 360, 390, 768, 1024, 1100, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/pricing");
    await page.getByLabel("Document service").selectOption("combo");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}`).toBe(true);
    const clippedOptions = await page.locator(".estimate-fields select").evaluateAll(selects => selects.filter(element => {
      const select = element as HTMLSelectElement;
      const style = getComputedStyle(select);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      context.font = `${style.fontSize} ${style.fontFamily}`;
      const available = select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      return Array.from(select.options).some(option => context.measureText(option.text).width > available);
    }).map(select => select.id));
    expect(clippedOptions, `clipped selector labels at ${width}px`).toEqual([]);
  }
  await page.setViewportSize({ width: 320, height: 800 });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: artifact("ux-review-20261103/pricing-after-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.screenshot({ path: artifact("ux-review-20261103/pricing-after-desktop.png"), fullPage: true });
  await page.addStyleTag({ content: ".editorial-body p, .editorial-body li, .editorial-lead { font-size: 200% !important; }" });
  await page.setViewportSize({ width: 640, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
