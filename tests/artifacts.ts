import path from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
const directory = process.env.TEST_RUN_DIR || path.join("test-results", `browser-run-${randomUUID()}`);
export function artifact(name: string) {
  const target = path.join(directory, name);
  mkdirSync(path.dirname(target), { recursive: true });
  return target;
}
