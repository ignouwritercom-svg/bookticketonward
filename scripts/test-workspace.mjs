// Child-only loopback provider overrides; never edits .env.local or hosted records.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { startWorkspaceFixture } from "./workspace-fixture.mjs";
const fixture = await startWorkspaceFixture();
const directory = `test-results/workspace-run-${randomUUID()}`;
const env = { ...process.env, SITE_MANAGEMENT_ENABLED: "false", WORKSPACE_FIXTURE: "true", TEST_RUN_DIR: directory, PLAYWRIGHT_OUTPUT_DIR: `${directory}/playwright`, SITE_INDEXING_ENABLED: "false", NEXT_PUBLIC_SUPABASE_URL: fixture.url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: fixture.key, NEXT_PUBLIC_SUPABASE_OTP_LENGTH: "6", SUPABASE_SECRET_KEY: "", SUPABASE_DB_URL: "" };
const run = args => new Promise((resolve, reject) => { const child = spawn(process.execPath, args, { env, stdio: "inherit" }); child.on("error", reject); child.on("exit", code => code === 0 ? resolve() : reject(new Error("Workspace fixture check failed"))); });
console.log(`SYNTHETIC local provider evidence: ${directory}`);
try { await run(["node_modules/next/dist/bin/next", "build"]); await run(["node_modules/@playwright/test/cli.js", "test", "tests/workspace-provider.spec.ts"]); if (fixture.forbiddenReads()) throw new Error("Unscoped fixture reads were blocked"); }
catch { process.exitCode = 1; }
finally { await fixture.close(); }
