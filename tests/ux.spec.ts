import { artifact } from "./artifacts";
import { smallVisibleText } from "./typography";
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

test("service decision cards open the matching booking flow and preserve their meaning without JavaScript", async ({ page, browser }) => {
  for (const [label, service] of [["Start a flight request", "flight"], ["Start a hotel request", "hotel"], ["Start a combo request", "combo"]]) {
    await page.goto("/dummy-ticket");
    await page.locator(".detail-grid").getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/book\\?service=${service}$`));
    const booking = page.locator("#booking-main");
    await expect(booking.getByLabel("From", { exact: true })).toHaveCount(service === "hotel" ? 0 : 1);
    await expect(booking.getByRole("group", { name: "Hotel stay 1", exact: true })).toHaveCount(service === "flight" ? 0 : 1);
  }
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const noJs = await context.newPage();
    await noJs.goto("http://127.0.0.1:3100/dummy-ticket");
    await expect(noJs.getByRole("region", { name: "Starting document service fees" })).toBeVisible();
    await expect(noJs.locator(".detail-grid").getByRole("link", { name: "Start a combo request", exact: true })).toHaveAttribute("href", "/book?service=combo");
    await noJs.goto("http://127.0.0.1:3100/guides/flight-hotel-date-checklist");
    await expect(noJs.getByRole("heading", { name: "Work through an overnight-arrival example" })).toBeVisible();
    await expect(noJs.locator(".detail-steps > li")).toHaveCount(3);
  } finally { await context.close(); }
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
  await menu.getByRole("link", { name: "Book dummy ticket", exact: false }).focus();
  await page.keyboard.press("Tab"); await expect(menu).not.toBeVisible();
  await toggle.click(); await page.setViewportSize({ width: 1440, height: 900 }); await page.setViewportSize({ width: 390, height: 844 }); await expect(menu).not.toBeVisible();
  await page.setViewportSize({ width: 667, height: 320 }); await toggle.click();
  const booking = menu.getByRole("link", { name: "Book dummy ticket", exact: false });
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
  await navigation.getByRole("link", { name: "Guides", exact: true }).click(); await expect(page.locator("h1")).toContainText("Planning Guides");
  await context.close();
});

test("customer and staff skip links move keyboard focus to content", async ({ page }) => {
  for (const route of ["/account/orders", "/admin", "/admin/orders"]) {
    await page.goto(route); await page.keyboard.press("Tab"); await expect(page.locator(".skip-link")).toBeFocused(); await page.keyboard.press("Enter"); await expect(page.locator("#main-content")).toBeFocused();
  }
});

test("readable typography and homepage account layout survive sign-in navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const features = page.locator(".account-feature-grid");
  const typography = () => features.evaluate(element => {
    const style = getComputedStyle(element);
    return { display: style.display, background: style.backgroundColor, font: style.fontSize, lineHeight: style.lineHeight };
  });
  const original = await typography();
  expect(original.display).toBe("grid");
  await page.locator(".header-actions").getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome Back", exact: true })).toBeVisible();
  await page.locator(".site-header .brand").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dummy Flight Ticket & Dummy Hotel Booking");
  expect(await typography()).toEqual(original);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await smallVisibleText(page), `homepage text at ${width}px`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const controlSizes = await page.locator("#trip-starter input:not([type=radio])").evaluateAll(inputs => inputs.map(input => parseFloat(getComputedStyle(input).fontSize)));
    expect(controlSizes.every(size => size >= 16)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#trip-starter").screenshot({ path: artifact("typography-starter-mobile.png") });
  await page.locator(".account-preview").screenshot({ path: artifact("typography-account-after-login.png") });
  for (const route of ["/login", "/book"]) {
    await page.goto(route);
    expect(await smallVisibleText(page), route).toEqual([]);
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
