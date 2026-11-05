// Build/run tests with EMPTY Supabase configuration in child processes only.
// .env.local is never changed; tests must not contact the development backend.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
const args = process.argv.slice(2);
const indexable = args.includes("--seo-indexable");
const runDirectory = `test-results/browser-run-${randomUUID()}`;
console.log(`Retained browser evidence: ${runDirectory}`);
const env = { ...process.env, SITE_MANAGEMENT_ENABLED: "false",
  TEST_RUN_DIR: runDirectory,
  PLAYWRIGHT_OUTPUT_DIR: `${runDirectory}/playwright`,
  SITE_URL: "https://dummyticketonward.com",
  SITE_INDEXING_ENABLED: indexable ? "true" : "false",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  NEXT_PUBLIC_SUPABASE_OTP_LENGTH: "6",
  SUPABASE_SECRET_KEY: "",
};
const run = args => new Promise((resolve,reject) => {
  const child=spawn(process.execPath,args,{env,stdio:"inherit"});
  child.on("error",reject);
  child.on("exit",code=>code===0 ? resolve() : reject(new Error("Isolated browser command failed")));
});
try {
  await run(["node_modules/next/dist/bin/next","build"]);
  await run(["node_modules/@playwright/test/cli.js","test",...args.filter(arg => arg !== "--seo-indexable")]);
} catch { process.exitCode=1; }
