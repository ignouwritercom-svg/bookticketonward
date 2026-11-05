import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import type { LocationOption } from "../src/lib/location-types";
import { artifact } from "./artifacts";

const origin = "http://127.0.0.1:3100";
async function popupFits(page: Page, width: number, height: number) {
  // Focus/viewport changes can animate scrolling; assert the settled overlay,
  // rather than capturing the intermediate animation frame.
  await expect.poll(async () => {
    const box = await page.locator(".location-popover").boundingBox();
    return !!box && box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= height;
  }).toBe(true);
}
async function airport(page: Page, label: string, code: string) {
  const field = page.getByRole("combobox", { name: label, exact: true });
  await field.fill(code);
  await page.getByRole("option", { name: new RegExp(`\\(${code}\\)`) }).click();
  return field;
}

test("REAL local reference data: provenance, IATA ranking, aliases, countries, duplicates and bounded API", async ({ request }) => {
  const bytes = readFileSync("src/data/locations.json.gz");
  const manifest = JSON.parse(readFileSync("src/data/locations.manifest.json", "utf8"));
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.snapshotSha256);
  const snapshot = JSON.parse(gunzipSync(bytes).toString("utf8"));
  expect(new Set(snapshot.records.map((r: LocationOption) => r.id)).size).toBe(snapshot.records.length);
  for (const kind of ["airport", "city", "country"]) expect(snapshot.records.filter((r: LocationOption) => r.kind === kind).length).toBe(manifest.counts[kind]);
  async function search(kind: string, query: string, country?: string) {
    const response = await request.post("/api/locations", { headers: { Origin: origin }, data: { kind, query, ...(country ? { country } : {}) } });
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    const { results } = await response.json() as { results: LocationOption[] };
    expect(results.length).toBeLessThanOrEqual(8);
    for (const item of results) { expect(item).not.toHaveProperty("search"); expect(item).not.toHaveProperty("weight"); }
    return results;
  }
  expect((await search("airport", "DEL"))[0].value).toBe("New Delhi (DEL)");
  expect((await search("airport", "Heathrow"))[0].code).toBe("LHR");
  expect((await search("airport", "Dubai"))[0].code).toBe("DXB");
  expect((await search("city", "München"))[0].countryCode).toBe("DE");
  const paris = await search("city", "Paris");
  expect(paris[0].countryCode).toBe("FR");
  expect(paris.some(item => item.countryCode === "US")).toBe(true);
  expect((await search("city", "Paris", "France"))[0].countryCode).toBe("FR");
  expect((await search("city", "Paris", "USA"))[0].countryCode).toBe("US");
  expect((await search("city", "Dubai", "France"))[0].countryCode).toBe("AE");
  expect((await search("country", "UAE"))[0].countryCode).toBe("AE");
  expect(await search("city", "ZzzzzzzNotAPlace")).toEqual([]);
  expect(await search("airport", "D")).toEqual([]);
  expect((await search("airport", ""))[0].code).toBe("DEL");
  for (const data of [{ kind: "property", query: "Paris" }, { kind: "city", query: "x".repeat(101) }, { kind: "city", query: "Paris", passenger: "Must not be accepted" }]) {
    expect((await request.post("/api/locations", { headers: { Origin: origin }, data })).status()).toBe(400);
  }
  expect((await request.post("/api/locations", { headers: { Origin: "https://other.example" }, data: { kind: "city", query: "Paris" } })).status()).toBe(403);
  expect((await request.get("/api/locations")).status()).toBe(405);
});

test("REAL homepage autocomplete: keyboard choice, clear, swap and trip handoff", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const from = page.getByRole("combobox", { name: "From", exact: true });
  await from.fill("DEL");
  await expect(page.getByRole("option").first()).toHaveAccessibleName(/New Delhi.*DEL/);
  await from.press("ArrowDown");
  await expect(from).toHaveAttribute("aria-activedescendant", "from-option-0");
  await from.press("Enter");
  await expect(from).toHaveValue("New Delhi (DEL)");
  await expect(from).toBeFocused();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  const to = await airport(page, "To", "DXB");
  await page.getByRole("button", { name: "Swap departure and destination" }).click();
  await expect(from).toHaveValue("Dubai (DXB)");
  await expect(to).toHaveValue("New Delhi (DEL)");
  await page.getByRole("button", { name: "Clear To", exact: true }).click();
  await expect(to).toHaveValue("");
  await expect(to).toBeFocused();
  await airport(page, "To", "LHR");
  await page.getByLabel("Departure date", { exact: true }).fill("2099-06-15");
  await page.getByRole("button", { name: "Book dummy ticket", exact: true }).click();
  await expect(page).toHaveURL(/\/book\?/);
  await expect(page.locator("#booking-main").getByLabel("From", { exact: true })).toHaveValue("Dubai (DXB)");
  await expect(page.locator("#booking-main").getByLabel("To", { exact: true })).toHaveValue("London (LHR)");
  expect([...new URL(page.url()).searchParams.keys()].sort()).toEqual(["departure", "from", "to", "type"]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

test("REAL multi-city autocomplete preserves sector values and add/remove focus", async ({ page }) => {
  await page.goto("/book?type=multi-city");
  const first = page.getByRole("group", { name: "Sector 1", exact: true });
  const second = page.getByRole("group", { name: "Sector 2", exact: true });
  await first.getByLabel("From", { exact: true }).fill("DEL");
  await page.getByRole("option", { name: /New Delhi.*DEL/ }).click();
  await second.getByLabel("From", { exact: true }).fill("DXB");
  await page.getByRole("option", { name: /Dubai.*DXB/ }).click();
  await page.getByRole("button", { name: "Add sector", exact: true }).click();
  const third = page.getByRole("group", { name: "Sector 3", exact: true });
  await expect(third.getByLabel("From", { exact: true })).toBeFocused();
  await third.getByLabel("From", { exact: true }).fill("LHR");
  await page.getByRole("option", { name: /London.*LHR/ }).click();
  await page.getByRole("button", { name: "Remove sector 2", exact: true }).click();
  await expect(first.getByLabel("From", { exact: true })).toHaveValue("New Delhi (DEL)");
  await expect(second.getByLabel("From", { exact: true })).toHaveValue("London (LHR)");
  await expect(first.getByLabel("From", { exact: true })).toBeFocused();
});

test("REAL hotel lookup autofills country, clears derived country on edit and isolates multiple stays", async ({ page }) => {
  await page.goto("/book?service=hotel");
  const first = page.getByRole("group", { name: "Hotel stay 1", exact: true });
  const city = first.getByLabel("Hotel city", { exact: true });
  const country = first.getByLabel("Country", { exact: true });
  await city.fill("Paris");
  await page.getByRole("option", { name: /Paris,.*France/ }).first().click();
  await expect(city).toHaveValue("Paris");
  await expect(country).toHaveValue("France");
  await city.fill("Rome");
  await expect(country).toHaveValue("");
  await page.getByRole("option", { name: /Rome,.*Italy/ }).first().click();
  await expect(country).toHaveValue("Italy");
  // An explicit country override is user input, so editing the city preserves it.
  await country.fill("USA");
  await page.getByRole("option", { name: /United States/ }).first().click();
  await city.fill("Paris");
  await expect(country).toHaveValue("United States");
  await expect(page.getByRole("option").first()).toHaveAccessibleName(/Paris,.*United States/);
  await expect(page.getByRole("option", { name: /Paris,.*France/ }).first()).toBeVisible();
  await city.press("Escape");
  await page.getByRole("button", { name: "Add another hotel stay" }).click();
  const second = page.getByRole("group", { name: "Hotel stay 2", exact: true });
  await expect(second.getByLabel("Hotel city", { exact: true })).toBeFocused();
  await second.getByLabel("Hotel city", { exact: true }).fill("Paris");
  await page.getByRole("option", { name: /Paris,.*France/ }).first().click();
  await expect(second.getByLabel("Country", { exact: true })).toHaveValue("France");
  await page.getByRole("button", { name: "Remove hotel stay 1", exact: true }).click();
  await expect(first.getByLabel("Hotel city", { exact: true })).toHaveValue("Paris");
  await expect(first.getByLabel("Country", { exact: true })).toHaveValue("France");
  await expect(first.getByLabel("Hotel city", { exact: true })).toBeFocused();
  await expect(first.getByLabel("Hotel or area preference (optional)")).not.toHaveAttribute("role", "combobox");
  await first.getByLabel("Check-in date", { exact: true }).fill("2099-06-16");
  await first.getByLabel("Check-out date", { exact: true }).fill("2099-06-20");
  await page.getByRole("button", { name: "Continue to passengers" }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(first.getByLabel("Country", { exact: true })).toHaveValue("France");
  await first.getByLabel("Hotel city", { exact: true }).fill("Dubai");
  await page.getByRole("option", { name: /Dubai,.*United Arab Emirates/ }).first().click();
  await expect(first.getByLabel("Country", { exact: true })).toHaveValue("United Arab Emirates");
});

test("MOCKED delayed and failed lookups cannot overwrite a newer search or block manual entry", async ({ page }) => {
  const option = (code: string): LocationOption => ({ id: code, kind: "airport", value: `${code} test location`, label: `${code} test location`, detail: "Synthetic lookup test", code, country: "India", countryCode: "IN" });
  let oldStarted = false;
  let releaseOld!: () => void;
  const held = new Promise<void>(resolve => { releaseOld = resolve; });
  await page.route("**/api/locations", async route => {
    const { query } = route.request().postDataJSON();
    if (query === "OLD") { oldStarted = true; await held; await route.fulfill({ json: { results: [option("OLD")] } }).catch(() => {}); }
    else if (query === "ERR") await route.fulfill({ status: 503, json: { error: "Synthetic unavailable" } });
    else await route.fulfill({ json: { results: [option("NEW")] } });
  });
  await page.goto("/");
  const from = page.getByRole("combobox", { name: "From", exact: true });
  await from.fill("OLD");
  await expect.poll(() => oldStarted).toBe(true);
  await from.fill("NEW");
  await expect(page.getByRole("option").first()).toHaveText(/NEW test/);
  releaseOld();
  await from.press("ArrowDown");
  await from.press("Enter");
  await expect(from).toHaveValue("NEW test location");
  await from.fill("ERR");
  await expect(page.locator(".location-search-message")).toHaveText(/Suggestions are unavailable/);
  await from.fill("A manually entered airport");
  await from.press("Escape");
  await expect(from).toHaveValue("A manually entered airport");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("REAL explicit selection, IME, Escape and Tab preserve manual text", async ({ page }) => {
  let requests = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/locations") requests++; });
  await page.goto("/");
  const from = page.getByRole("combobox", { name: "From", exact: true });
  await from.fill("DEL");
  await expect(page.getByRole("option").first()).toBeVisible();
  await from.press("Enter");
  await expect(from).toHaveValue("DEL");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("listbox")).toHaveCount(0);
  const beforeReopen = requests;
  await from.click();
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.waitForTimeout(250); // Beyond debounce: reopening must not refetch/flash.
  expect(requests).toBe(beforeReopen);
  await from.press("ArrowDown");
  await from.dispatchEvent("compositionstart");
  await from.press("Enter");
  await expect(from).toHaveValue("DEL");
  await from.dispatchEvent("compositionend");
  await from.press("Escape");
  await expect(from).toHaveValue("DEL");
  await from.click();
  await from.press("Tab");
  await expect(from).not.toBeFocused();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Clear From", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(from).toHaveValue("");
  await expect(from).toBeFocused();
  await expect(page).toHaveURL(/\/$/);
});

test("REAL mobile touch choices, popup bounds, scroll and open-combobox accessibility", async ({ browser }) => {
  test.setTimeout(90000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/book?service=combo`);
    const from = page.getByRole("combobox", { name: "From", exact: true });
    await from.scrollIntoViewIfNeeded();
    await from.tap();
    await from.fill("DEL");
    await expect(page.getByRole("option", { name: /New Delhi.*DEL/ })).toBeVisible();
    await popupFits(page, 390, 844);
    await page.screenshot({ path: artifact("locations-flight-touch.png") });
    await page.getByRole("option", { name: /New Delhi.*DEL/ }).tap();
    await expect(from).toHaveValue("New Delhi (DEL)");
    const city = page.getByRole("combobox", { name: "Hotel city", exact: true });
    await city.scrollIntoViewIfNeeded();
    await city.tap();
    await city.fill("Paris");
    await expect(page.getByRole("option", { name: /Paris,.*France/ }).first()).toBeVisible();
    await popupFits(page, 390, 844);
    await page.screenshot({ path: artifact("locations-hotel-touch.png") });
    await page.getByRole("option", { name: /Paris,.*France/ }).first().tap();
    await expect(page.getByRole("combobox", { name: "Country", exact: true })).toHaveValue("France");
    const country = page.getByRole("combobox", { name: "Country", exact: true });
    for (const { width, height } of [{ width: 320, height: 844 }, { width: 390, height: 844 }, { width: 667, height: 320 }, { width: 390, height: 420 }, { width: 768, height: 844 }, { width: 1440, height: 844 }]) {
      await page.setViewportSize({ width, height });
      await country.fill("");
      await country.scrollIntoViewIfNeeded();
      await country.click();
      await expect(page.getByRole("option")).toHaveCount(8);
      await popupFits(page, width, height);
      const bounds = await page.locator(".location-popover").boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390 && height === 844) {
        const list = page.getByRole("listbox");
        await expect(list).toBeVisible();
        const box = (await list.boundingBox())!;
        const cdp = await context.newCDPSession(page);
        const x = box.x + box.width / 2;
        const y = box.y + box.height - 12;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        for (let i = 1; i <= 5; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - i * 22 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
        await cdp.detach();
      }
      await country.press("ArrowUp");
      await expect(country).toHaveAttribute("aria-activedescendant", /-option-7$/);
      const active = page.locator(`#${await country.getAttribute("aria-activedescendant")}`);
      await expect(active).toBeInViewport();
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
      await page.screenshot({ path: artifact(`locations-country-${width}x${height}.png`) });
      await country.press("Escape");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await city.fill("Rome");
    await page.getByRole("option", { name: /Rome,.*Italy/ }).first().tap();
    await expect(country).toHaveValue("Italy");
    await expect(city).toHaveValue("Rome");
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  } finally { await context.close(); }
});
