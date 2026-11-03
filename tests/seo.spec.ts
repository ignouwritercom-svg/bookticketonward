import { artifact } from "./artifacts";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { publicEntries } from "../src/content/registry";
import { publicPages } from "../src/content/pages";
import { destinations } from "../src/content/destinations";
import { guides } from "../src/content/guides";
import { approvedOrigin, robotsFor, siteConfig, sitemapFor } from "../src/lib/seo";
import { publicCollectionStatus } from "../src/lib/public-routing";

const liveIndexing = process.env.SITE_INDEXING_ENABLED === "true";

test("SEO origin validation and explicit launch gate fail closed", () => {
  for (const path of ["/login", "/book", "/account/orders", "/admin", "/api/documents/anything", "/guides-private"]) expect(publicCollectionStatus(path)).toBeNull();
  expect(publicCollectionStatus("/destinations/france")).toBe("known");
  expect(publicCollectionStatus("/guides/missing")).toBe("missing");
  expect(siteConfig({})).toEqual({ origin: approvedOrigin, index: false });
  for (const SITE_URL of ["", "not-a-url", "http://example.com", "https://localhost", "https://example.com/path", "https://user:secret@example.com", "https://example.com?key=value", "https://example.com#part"]) {
    expect(siteConfig({ SITE_URL }).index).toBe(false);
    expect(() => siteConfig({ SITE_URL, SITE_INDEXING_ENABLED: "true" })).toThrow("valid HTTPS");
  }
  const enabled = siteConfig({ SITE_INDEXING_ENABLED: "true" });
  expect(enabled.index).toBe(true);
  const sitemap = sitemapFor(publicEntries, enabled);
  expect(sitemap).toHaveLength(publicEntries.filter(item => !item.draft).length);
  expect(sitemap.every(item => item.url.startsWith(approvedOrigin))).toBe(true);
  expect(sitemap.some(item => /terms|privacy|refunds|contact|account|admin|book$|login/.test(item.url))).toBe(false);
  expect(sitemapFor(publicEntries, { origin: approvedOrigin, index: false })).toEqual([]);
  expect(robotsFor(enabled).sitemap).toBe(`${approvedOrigin}/sitemap.xml`);
  for (const item of [...publicPages, ...destinations, ...guides]) {
    expect(item.sections.length).toBeGreaterThan(0);
    expect(item.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
  for (const item of destinations) {
    expect(item.country).toBeTruthy();
    expect(item.sources.every(source => /^https:\/\/(www\.)?(gov.uk|france-visas.gouv.fr)\//.test(source.url))).toBe(true);
    for (const slug of item.guideSlugs) expect(guides.some(guide => guide.slug === slug)).toBe(true);
  }
  for (const guide of guides) for (const slug of guide.relatedGuideSlugs) expect(guides.some(item => item.slug === slug)).toBe(true);
});

test("all public pages: metadata, headings, schema, internal links and reachability", async ({ page, request }, testInfo) => {
  test.setTimeout(180000);
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const headings = new Set<string>();
  const graph = new Map<string, string[]>();
  const targets = new Set<string>();
  const ids = new Map<string, string[]>();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const entry of publicEntries) {
    expect((await page.goto(entry.path))?.status(), entry.path).toBe(200);
    const title = await page.title();
    expect(title, entry.path).toBeTruthy(); expect(titles.has(title), `duplicate title ${entry.path}`).toBe(false); titles.add(title);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description?.length).toBeGreaterThan(50); expect(descriptions.has(description!), `duplicate description ${entry.path}`).toBe(false); descriptions.add(description!);
    const h1 = page.locator("h1"); await expect(h1).toHaveCount(1); const heading = (await h1.textContent())!;
    expect(headings.has(heading)).toBe(false); headings.add(heading);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new URL(entry.path, approvedOrigin).href);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", new URL(entry.path, approvedOrigin).href);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${approvedOrigin}/social-image`);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /temporary flight and hotel reservation documents/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", `${liveIndexing && !entry.draft ? "index" : "noindex"}, ${liveIndexing ? "follow" : "nofollow"}`);
    const levels = await page.locator("main h1, main h2, main h3").evaluateAll(nodes => nodes.map(node => Number(node.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `${entry.path} heading hierarchy`).toBeLessThanOrEqual(1);
    ids.set(entry.path, await page.locator("[id]").evaluateAll(nodes => nodes.map(node => node.id)));
    const links = await page.locator("a[href]").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")!));
    const paths: string[] = [];
    for (const href of links) {
      if (!href.startsWith("/") && !href.startsWith("#")) continue;
      const url = new URL(href, `http://127.0.0.1:3100${entry.path}`);
      targets.add(url.pathname + url.search + url.hash); paths.push(url.pathname);
    }
    graph.set(entry.path, paths);
    if (entry.path !== "/") {
      await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      const parsed = schemas.map(value => JSON.parse(value));
      expect(parsed.find(item => item["@type"] === "BreadcrumbList").itemListElement.at(-1).item).toBe(new URL(entry.path, approvedOrigin).href);
      const contentSchema = parsed.find(item => ["Article", "WebPage"].includes(item["@type"]));
      expect(heading).toContain(contentSchema.headline ?? contentSchema.name);
      expect(contentSchema.description).toBe(description);
      expect(schemas.join(" ")).not.toMatch(/aggregateRating|reviewRating|FAQPage/);
    }
  }
  const reached = new Set<string>(); const pending = ["/"];
  while (pending.length) { const path = pending.pop()!; if (reached.has(path)) continue; reached.add(path); for (const target of graph.get(path) ?? []) if (graph.has(target)) pending.push(target); }
  expect(publicEntries.filter(item => !reached.has(item.path)), "orphan public pages").toEqual([]);
  for (const target of targets) {
    const url = new URL(target, "http://127.0.0.1:3100");
    if (url.hash) {
      expect(ids.get(url.pathname), `missing linked page ${target}`).toBeDefined();
      expect(ids.get(url.pathname), `broken anchor ${target}`).toContain(decodeURIComponent(url.hash.slice(1)));
    }
    const response = await request.get(url.pathname + url.search);
    expect(response.status(), `broken internal link ${target}`).toBeLessThan(400);
  }
  await page.goto("/pricing?utm_source=test");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${approvedOrigin}/pricing`);
  expect(errors).toEqual([]);
  await testInfo.attach("seo-crawl-summary", { body: JSON.stringify({ pages: publicEntries.length, links: targets.size, orphanPages: 0, duplicateTitles: 0, brokenLinks: 0, indexableMode: liveIndexing }), contentType: "application/json" });
});

test("sitemap, robots, social image, unknown slugs and URL normalisation", async ({ request }) => {
  const robots = await request.get("/robots.txt"); expect(robots.status()).toBe(200);
  const robotsText = await robots.text();
  const response = await request.get("/sitemap.xml"); expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("xml");
  const sitemap = await response.text();
  if (liveIndexing) {
    expect(robotsText).toContain("Allow: /"); expect(robotsText).toContain(`Sitemap: ${approvedOrigin}/sitemap.xml`);
    const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
    expect(locations.sort()).toEqual(publicEntries.filter(item => !item.draft).map(item => new URL(item.path, approvedOrigin).href).sort());
  } else { expect(robotsText).toContain("Disallow: /"); expect(sitemap).not.toContain("<loc>"); }
  const image = await request.get("/social-image"); expect(image.status()).toBe(200); expect(image.headers()["content-type"]).toContain("image/png");
  const bytes = await image.body(); expect(bytes.readUInt32BE(16)).toBe(1200); expect(bytes.readUInt32BE(20)).toBe(630); expect(bytes.length).toBeLessThan(150000);
  for (const path of ["/destinations/not-published", "/guides/not-published", "/not-a-public-page"]) {
    const unknown = await request.get(path); expect(unknown.status()).toBe(404); expect(await unknown.text()).toContain("noindex");
  }
  const redirect = await request.get("/pricing/", { maxRedirects: 0 }); expect(redirect.status()).toBe(308); expect(redirect.headers().location).toBe("/pricing");
});

test("private pages remain noindex and private APIs deny anonymous access", async ({ page, request }) => {
  for (const path of ["/login", "/book", "/account/orders", "/admin", "/admin/orders"]) {
    const response = await page.goto(path); expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  }
  for (const path of ["/api/documents/00000000-0000-4000-8000-000000000000", "/api/bookings/00000000-0000-4000-8000-000000000000"]) {
    const response = await request.get(path); expect(response.status()).toBeGreaterThanOrEqual(400); expect(response.headers()["x-robots-tag"]).toContain("noindex"); expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("public mobile layouts and WCAG automated checks", async ({ page }, testInfo) => {
  test.setTimeout(240000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const entry of publicEntries.filter(item => item.path !== "/")) {
    await page.goto(entry.path);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${entry.path} overflows ${width}`).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations, entry.path).toEqual([]);
  }
  await page.goto("/pricing"); await page.screenshot({ path: artifact("public-pricing-mobile.png"), fullPage: true });
  await page.goto("/destinations/united-kingdom"); await page.screenshot({ path: artifact("public-uk-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto("/sample-dummy-ticket"); await page.screenshot({ path: artifact("public-sample-desktop.png"), fullPage: true });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await testInfo.attach("mobile-a11y-summary", { body: JSON.stringify({ pages: publicEntries.length - 1, widths: [320, 390, 768, 1440], violations: 0 }), contentType: "application/json" });
});

test("public content works without JavaScript and keyboard navigation remains usable", async ({ browser, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await context.newPage();
  for (const path of ["/pricing", "/faq", "/destinations/france", "/guides/check-your-document-requirements"]) {
    await noJs.goto(`http://127.0.0.1:3100${path}`); await expect(noJs.locator("h1")).toBeVisible(); await expect(noJs.locator("main")).toContainText("Prepare a booking draft");
  }
  await noJs.goto("http://127.0.0.1:3100/faq"); const disclosure = noJs.locator(".editorial-faqs summary").first(); await disclosure.click(); await expect(disclosure.locator("..")).toHaveAttribute("open", ""); await context.close();
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/pricing");
  await page.keyboard.press("Tab"); await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused(); await page.keyboard.press("Enter"); await expect(page).toHaveURL(/#main-content$/);
  await page.getByRole("button", { name: "Open navigation" }).click(); await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await page.getByRole("link", { name: "Refunds (draft)", exact: true }).click(); await expect(page.locator(".content-notice")).toContainText("business approval required");
});
