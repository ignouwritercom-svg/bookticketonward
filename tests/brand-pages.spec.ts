import { expect, test } from "@playwright/test";
import { artifact } from "./artifacts";

test("help topics and policy stages navigate to the right record or explanation, including without JavaScript", async ({ page, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/contact");
  await page.locator(".brand-topic-grid").getByRole("link", { name: /Help with email sign-in/ }).click();
  await expect(page).toHaveURL(/\/contact#trouble-signing-in$/);
  expect(await page.locator("#trouble-signing-in").evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(72);
  await page.goto("/refunds");
  await expect(page.getByRole("navigation", { name: "Service policies" }).getByRole("link", { name: "Changes & refunds" })).toHaveAttribute("aria-current", "page");
  await page.locator(".policy-stage-grid").getByRole("link", { name: "Read about draft changes" }).click();
  await expect(page).toHaveURL(/#correcting-a-draft-or-existing-order$/);
  await expect(page.locator(".content-notice")).toContainText("Provisional policy notice");
  await page.getByRole("navigation", { name: "Service policies" }).getByRole("link", { name: "Privacy notice" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("link", { name: "Explore the services", exact: true })).toHaveAttribute("href", "/dummy-ticket");

  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const noJs = await context.newPage();
    await noJs.goto("http://127.0.0.1:3100/");
    await noJs.locator(".site-footer").getByRole("link", { name: "About DummyTicket", exact: true }).click();
    await expect(noJs).toHaveURL("http://127.0.0.1:3100/about");
    await expect(noJs.getByRole("heading", { name: "About DummyTicket", level: 1 })).toBeVisible();
    await noJs.getByRole("link", { name: "Our approach", exact: true }).click();
    await expect(noJs).toHaveURL(/#travel-paperwork-deserves-a-little-more-clarity$/);
    await noJs.goto("http://127.0.0.1:3100/refunds");
    await noJs.getByRole("navigation", { name: "Service policies" }).getByRole("link", { name: "Service terms" }).click();
    await expect(noJs.getByRole("heading", { name: "Terms of Service", level: 1 })).toBeVisible();
    await noJs.screenshot({ path: artifact("brand-terms-mobile-no-js.png"), fullPage: true });
  } finally { await context.close(); }
});

test("brand document artwork stays contained and leaves its sample caption readable across widths", async ({ page }) => {
  for (const route of ["/about", "/dummy-ticket"]) {
    await page.goto(route);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} at ${width}`).toBe(true);
      const geometry = await page.locator(".brand-folio").evaluate(element => {
        const outer = element.getBoundingClientRect();
        const paper = element.querySelector(".folio-paper-hotel")!.getBoundingClientRect();
        const caption = element.querySelector(".folio-caption")!.getBoundingClientRect();
        return { inside: paper.left >= outer.left && paper.right <= outer.right, captionClear: paper.bottom + 4 <= caption.top };
      });
      expect(geometry, `${route} illustration at ${width}`).toEqual({ inside: true, captionClear: true });
    }
    await page.locator(".brand-hero").screenshot({ path: artifact(`brand-${route.slice(1)}-hero-desktop.png`) });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: artifact(`brand-${route.slice(1)}-mobile.png`), fullPage: true });
  }
});
