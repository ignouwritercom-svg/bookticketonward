import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./supabase/config";
import { DOCUMENT_BUCKET } from "./documents";

// Privileged transport only. Never use this client for customer/staff DB reads.
// Every caller must authorize with the user's session BEFORE accessing Storage.
export function documentStorage() {
  const config = supabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secret || !/^sb_secret_[A-Za-z0-9_-]+$/.test(secret)) return null;
  return createClient(config.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  }).storage.from(DOCUMENT_BUCKET);
}
