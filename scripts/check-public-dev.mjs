// Read-only checks against an ALREADY running local Next dev server.
// No environment files, credentials, sign-in, hosted writes or server lifecycle changes.
import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";

const origin = new URL(process.argv[2] ?? "http://localhost:3000");
if (!["localhost", "127.0.0.1"].includes(origin.hostname) || origin.protocol !== "http:") throw new Error("Use a loopback development server");
const cached = path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(cached) ? cached : undefined) });
let failures = 0;
try {
  const page = await browser.newPage();
  let blocking = false;
  const inspect = text => { if (/encountered uncached data|blocking-prerender-dynamic|Blocking Route/i.test(text)) blocking = true; };
  page.on("pageerror", error => inspect(error.message));
  page.on("console", message => { if (message.type() === "error") inspect(message.text()); });
  async function check(label, response) {
    // Wait for hydration/dev route validation as well as the server response.
    await page.waitForFunction(() => !!document.querySelector("nextjs-portal")?.shadowRoot, null, { timeout: 15000 }).catch(() => {});
    const overlay = await page.locator("nextjs-portal").evaluateAll(elements => elements.map(element => element.shadowRoot?.textContent ?? ""));
    overlay.forEach(inspect);
    const ok = (!response || response.status() < 400) && await page.locator("main h1:visible").count() === 1 && await page.locator("footer.site-footer").isVisible() && !blocking;
    console.log(`${ok ? "PASS" : "FAIL"}: ${label}; HTTP ${response?.status() ?? "client navigation"}; blocking route ${blocking ? "detected" : "not detected"}`);
    if (!ok) failures++;
  }
  for (const route of ["/", "/pricing", "/dummy-ticket"]) {
    blocking = false;
    const response = await page.goto(new URL(route, origin).href, { waitUntil: "networkidle", timeout: 60000 });
    await check(`direct ${route}`, response);
  }
  blocking = false;
  const home = page.getByRole("link", { name: "DummyTicket home", exact: true }).first();
  if (await home.isVisible()) {
    await home.click(); await page.waitForURL(origin.href); await page.waitForLoadState("networkidle");
    await check("client navigation to /", null);
  } else { failures++; console.log("FAIL: home navigation unavailable"); }
} finally { await browser.close(); }
if (failures) process.exitCode = 1;
