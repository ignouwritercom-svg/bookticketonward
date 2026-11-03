import { test, expect } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { SupabaseClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import { OrderActivity } from "../src/components/account/order-activity";
import { NotificationJobCard } from "../src/components/admin/notification-job";
import type { NotificationJob } from "../src/lib/notifications";
import { artifact } from "./artifacts";

test("notification pages and mutation endpoints require fresh authorization and remain private", async ({ page, request }) => {
  for (const route of ["/account/notifications", "/admin/notifications"]) {
    const response = await page.goto(route);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  for (const endpoint of ["/api/notifications", "/api/admin/notifications"]) {
    const response = await request.post(endpoint, { headers: { origin: "http://127.0.0.1:3100" }, data: { id: "11111111-1111-4111-8111-111111111111", requestId: "22222222-2222-4222-8222-222222222222", acknowledgeDuplicate: true } });
    expect([401,403]).toContain(response.status()); expect(response.headers()["cache-control"]).toContain("no-store");
    expect((await request.post(endpoint, { headers: { origin: "https://untrusted.example" }, data: {} })).status()).toBe(403);
  }
});

test("SYNTHETIC activity and admin retry presentation are clear and accessible on mobile", async ({ page }) => {
  await page.goto("/admin");
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.map(link => (link as HTMLLinkElement).href));
  const id = "11111111-1111-4111-8111-111111111111";
  const timestamp = "2026-11-03T10:00:00Z";
  const recordedFilters: string[] = [];
  const fakeQuery = {
    select() { return this; }, eq(name: string, value: string) { recordedFilters.push(`${name}:${value}`); return this; }, order() { return this; },
    range() { return Promise.resolve({ data: [{ id, order_id:id, event:"document_withdrawn", created_at:timestamp, read_at:null }], error:null }); },
  };
  const client = { from: () => fakeQuery } as unknown as SupabaseClient;
  const activity = await OrderActivity({ client, userId: id });
  expect(recordedFilters).toContain(`owner_id:${id}`);
  const job: NotificationJob = { id, order_id:id, reference:"DT-TEST-NOTIFICATION", event:"document_ready", channel:"email", status:"failed", attempts:2, attempt_limit:5, created_at:timestamp,updated_at:timestamp,available_at:timestamp,accepted_at:null,lease_until:null,ambiguous:true,error_code:"ambiguous_delivery",history:[{attempt:2,started_at:timestamp,finished_at:timestamp,outcome:"ambiguous_delivery"}] };
  const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId:"synthetic" } as AppRouterInstance;
  const markup = renderToStaticMarkup(createElement(AppRouterContext.Provider, { value:router }, createElement("main",{className:"account-page admin-page"},createElement("h1",null,"Notification review"),activity,createElement(NotificationJobCard,{job}))));
  await page.setContent(`<!doctype html><html lang="en"><head><title>Synthetic notification review</title>${styles.map(href=>`<link rel="stylesheet" href="${href}">`).join("")}</head><body>${markup}</body></html>`);
  await expect(page.getByRole("heading",{name:"Document withdrawn"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Retry notification"})).toBeDisabled();
  await expect(page.getByText(/SMTP may have accepted/)).toBeVisible();
  await expect(page.locator('a[href^="/api/documents"]')).toHaveCount(0);
  for(const width of [320,390,768,1440]) { await page.setViewportSize({width,height:900}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); }
  await page.setViewportSize({width:390,height:844});
  expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({path:artifact("notifications-synthetic-mobile.png"),fullPage:true});
});
