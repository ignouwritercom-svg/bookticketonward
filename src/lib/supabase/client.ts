"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

// SSR's browser client uses cookies, not localStorage. Never store booking data here.
export function createClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("Account services are unavailable.");
  return createBrowserClient(config.url, config.key);
}
