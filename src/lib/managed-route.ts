import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./supabase/config";
// Public-only pre-stream check. No cookies, customer reads or server secret.
export async function managedRouteStatus(path: string) {
  if (process.env.SITE_MANAGEMENT_ENABLED !== "true") return null;
  const match = /^\/(guides|destinations)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
  if (!match || match[2].length > 80) return null;
  const config = supabaseConfig();
  if (!config) return "unavailable";
  const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(5000) }) } });
  try { const result = await client.rpc("public_site_route_status", { p_key: `${match[1] === "guides" ? "guide" : "destination"}:${match[2]}` }); return result.error ? "unavailable" : result.data as "published" | "withdrawn" | "default"; }
  catch { return "unavailable"; }
}
