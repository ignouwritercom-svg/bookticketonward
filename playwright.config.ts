import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const cachedChromium = path.join(
  process.env.LOCALAPPDATA ?? "",
  "ms-playwright",
  "chromium-1243",
  "chrome-win64",
  "chrome.exe",
);
const browserPath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync(cachedChromium) ? cachedChromium : undefined);

export default defineConfig({
  testDir: "./tests",
  // Playwright clears outputDir at startup. Keep historical integration evidence
  // and manually retained screenshots outside this disposable subdirectory.
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || `./test-results/browser-${randomUUID()}`,
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    launchOptions: { executablePath: browserPath },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
