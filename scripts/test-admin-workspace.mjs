// Actual local app + disposable PostgreSQL, synthetic Auth and Storage bridge.
// No .env edits, real credentials, hosted records or outgoing messages.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { startAdminFixture } from "./admin-fixture.mjs";
const fixture = await startAdminFixture();
const directory = `test-results/admin-workspace-${randomUUID()}`;
const env = { ...process.env, ADMIN_WORKSPACE_FIXTURE: "true", WORKSPACE_FIXTURE: "false", TEST_RUN_DIR: directory, PLAYWRIGHT_OUTPUT_DIR: `${directory}/playwright`, SITE_MANAGEMENT_ENABLED: "true", SITE_INDEXING_ENABLED: "true", SITE_URL: "https://dummyticketonward.com", NEXT_PUBLIC_SUPABASE_URL: fixture.url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: fixture.key, NEXT_PUBLIC_SUPABASE_OTP_LENGTH: "6", SUPABASE_SECRET_KEY: fixture.secret, SUPABASE_DB_URL: "", ADMIN_FIXTURE_PAID_ORDER: fixture.orders[0].id, ADMIN_FIXTURE_PENDING_ORDER: fixture.orders[1].id, ADMIN_FIXTURE_UNPAID_ORDER: fixture.orders[5].id };
const run = args => new Promise((resolve, reject) => { const child = spawn(process.execPath, args, { env, stdio: "inherit" }); child.on("error", reject); child.on("exit", code => code === 0 ? resolve() : reject(new Error("Local admin integration command failed"))); });
console.log(`LOCAL PostgreSQL + synthetic Auth/Storage browser evidence: ${directory}`);
try { await run(["node_modules/next/dist/bin/next", "build"]); await run(["node_modules/@playwright/test/cli.js", "test", "tests/admin-workspace.spec.ts"]); if (fixture.rejected()) throw new Error("Unsupported bridge operations were requested"); }
catch { process.exitCode = 1; }
finally { await fixture.close(); }
