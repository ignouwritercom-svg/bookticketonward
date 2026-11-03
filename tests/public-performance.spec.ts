import { artifact } from "./artifacts";
import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("mobile lab performance: layout stability, load and interaction measurements", async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0, interactionDuration: 0 };
    Object.assign(window, { publicLabMetrics: metrics });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.lcp = entry.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver(list => { for (const item of list.getEntries()) { const entry = item as PerformanceEntry & { hadRecentInput: boolean; value: number }; if (!entry.hadRecentInput) metrics.cls += entry.value; } }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.interactionDuration = Math.max(metrics.interactionDuration, entry.duration); }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  });
  const results = [];
  for (const path of ["/", "/pricing", "/faq", "/destinations/france"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const mainBefore = await page.locator("main").evaluate(element => element.getBoundingClientRect().top);
    await page.getByRole("button", { name: "Open navigation" }).click();
    expect(await page.locator("main").evaluate(element => element.getBoundingClientRect().top), "opening navigation must not move page content").toBe(mainBefore);
    await page.keyboard.press("Escape");
    if (path === "/faq") await page.locator(".editorial-faqs summary").first().click();
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => {
      const base = (window as unknown as { publicLabMetrics: { lcp: number; cls: number; interactionDuration: number } }).publicLabMetrics;
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      return { ...base, scriptBytes: resources.filter(item => item.initiatorType === "script").reduce((sum, item) => sum + item.encodedBodySize, 0), fontRequests: resources.filter(item => /\.(woff2?|ttf)(\?|$)/.test(item.name)).length };
    });
    expect(metrics.cls, `${path} layout shift`).toBeLessThanOrEqual(0.1);
    expect(metrics.fontRequests).toBe(0);
    results.push({ path, ...metrics, lcpTargetMet: metrics.lcp > 0 && metrics.lcp <= 2500, interactionTargetMet: metrics.interactionDuration <= 200 });
  }
  await cdp.detach();
  const report = JSON.stringify({ context: "Local Chromium lab, 390px viewport, cold cache, 4x CPU slowdown, 150ms latency, 1.6Mbps download. Interaction duration is a lab sample, not field INP. No field CWV claim.", results }, null, 2);
  await writeFile(artifact("public-performance.json"), report);
  await testInfo.attach("public-performance", { body: report, contentType: "application/json" });
});
