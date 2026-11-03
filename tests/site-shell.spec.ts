import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { publicEntries } from "../src/content/registry";
import { artifact } from "./artifacts";

const privatePages = ["/book", "/login", "/account/orders", "/account/notifications", "/account/orders/11111111-1111-4111-8111-111111111111", "/admin", "/admin/orders", "/admin/notifications", "/admin/orders/11111111-1111-4111-8111-111111111111"];
const routes = [...publicEntries.map(entry => entry.path), ...privatePages, "/not-a-public-page", "/destinations/not-published", "/guides/not-published"];

test("one consistent site header, logo, navigation and footer across every registered page and workspace", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let expectedFooter: unknown;
  for (const route of routes) {
    const response = await page.goto(route);
    await expect(page).toHaveURL(`http://127.0.0.1:3100${route}`);
    if (route.includes("not-published") || route === "/not-a-public-page") expect(response?.status()).toBe(404);
    await expect(page.locator("body > .site-header")).toHaveCount(1);
    await expect(page.locator("body > .site-footer")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.locator(".skip-link")).toHaveCount(1);
    await expect(page.locator("#main-content")).toHaveAttribute("tabindex", "-1");
    const header = page.locator("body > .site-header");
    const navigation = await header.locator(".desktop-nav a").evaluateAll(links => links.map(link => ({ text: link.textContent, href: link.getAttribute("href") })));
    expect(navigation).toEqual([{text:"Services",href:"/dummy-ticket"},{text:"Pricing",href:"/pricing"},{text:"Destinations",href:"/destinations"},{text:"Guides",href:"/guides"}]);
    await expect(header.locator(".brand-mark svg")).toHaveCount(1);
    await expect(page.locator(".site-footer .brand-mark svg")).toHaveCount(1);
    const footer = await page.locator(".site-footer").evaluate(element => ({ text: element.textContent, links: Array.from(element.querySelectorAll("a")).map(link => link.getAttribute("href")) }));
    expectedFooter ??= footer;
    expect(footer, route).toEqual(expectedFooter);
    expect(await page.locator(".header-row").evaluate(element => element.getBoundingClientRect().height), route).toBe(84);
  }
  expect(errors).toEqual([]);
});

test("brand navigation closes a persistent mobile menu and keeps one shared layout", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/pricing");
  await page.getByRole("button",{name:"Open navigation"}).click();
  await page.locator(".site-header .brand").click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await expect(page.getByRole("navigation",{name:"Mobile navigation"})).not.toBeVisible();
  await expect(page.locator("body > .site-header")).toHaveCount(1);
  await expect(page.locator("body > .site-footer")).toHaveCount(1);
});

test("shared navigation and workspace layouts remain readable, reachable and accessible on mobile", async ({ page }) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/", "/pricing", "/book", "/login", "/account/orders", "/admin/notifications", "/not-a-public-page"]) {
    await page.goto(route);
    for (const width of [320,390,768,1024,1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} at ${width}`).toBe(true);
      const logo = await page.locator(".site-header .brand").boundingBox();
      expect(logo && logo.x >= 0 && logo.x + logo.width <= width, `logo ${route} at ${width}`).toBe(true);
    }
    await page.setViewportSize({ width:390,height:844 });
    await page.keyboard.press("Tab"); await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter"); await expect(page.locator("#main-content")).toBeFocused();
    const toggle = page.getByRole("button", { name:"Open navigation" });
    await toggle.click(); await expect(page.getByRole("navigation",{name:"Mobile navigation"})).toBeVisible();
    await page.keyboard.press("Escape"); await expect(toggle).toBeFocused();
    expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations, route).toEqual([]);
    if (["/book","/login","/admin/notifications"].includes(route)) await page.screenshot({path:artifact(`shell-${route.slice(1).replaceAll("/","-")}-mobile.png`),fullPage:true});
  }
});

test("shared navigation and footer remain usable without JavaScript on booking, login and account pages", async ({ browser }) => {
  const context = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page = await context.newPage();
  for(const route of ["/book","/login","/account/orders","/admin"]) {
    await page.goto(`http://127.0.0.1:3100${route}`);
    await expect(page.getByRole("navigation",{name:"Navigation without JavaScript"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Open navigation"})).not.toBeVisible();
    await expect(page.locator(".public-footer")).toHaveCount(1);
    await expect(page.locator(".public-footer").getByRole("link",{name:"Contact information"})).toHaveAttribute("href","/contact");
  }
  await context.close();
});
