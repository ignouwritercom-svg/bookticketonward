import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseConfig } from "./supabase/config";
import { defaultSiteSnapshot, siteSeeds } from "./site-defaults";
import { managementKey, materializeContent, payloadSchema, preferencesSchema, pricingSchema, type PublicSiteSnapshot } from "./site-management";
import type { Destination, Guide, PublicContent } from "@/content/types";

export const siteManagementEnabled = () => process.env.SITE_MANAGEMENT_ENABLED === "true";
function publicClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("Managed website configuration unavailable");
  return createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) } });
}
function checkedPolicies(policies: PublicSiteSnapshot["policies"]) {
  if (![policies?.flight, policies?.reservation].every(policy => typeof policy?.version === "string" && policy.version.length > 0 && typeof policy.text === "string" && policy.text.length > 0 && policy.text.length <= 8000)) throw new Error("Booking policy unavailable");
  return policies;
}
export async function readBookingCatalog() {
  if (!siteManagementEnabled()) return { pricing: defaultSiteSnapshot.pricing, policies: defaultSiteSnapshot.policies };
  const { data, error } = await publicClient().rpc("public_booking_catalog");
  if (error || !data) throw new Error("Booking catalog unavailable");
  return { pricing: pricingSchema.parse(data.pricing), policies: checkedPolicies(data.policies) };
}
// Public-only RPC, publishable key, no user cookies or service/Storage secret.
// Order creation calls this uncached: a stale browser price is never authoritative.
export async function readPublicSite(): Promise<PublicSiteSnapshot> {
  if (!siteManagementEnabled()) return defaultSiteSnapshot;
  const { data, error } = await publicClient().rpc("public_site_snapshot");
  if (error || !data || !Array.isArray(data.records) || data.records.length > 200) throw new Error("Managed website content unavailable");
  const preferences = preferencesSchema.parse(data.preferences ?? defaultSiteSnapshot.preferences);
  const pricing = pricingSchema.parse(data.pricing);
  const policies = checkedPolicies(data.policies);
  const records = data.records.map((record: PublicSiteSnapshot["records"][number]) => {
    managementKey.parse(record.key);
    if (typeof record.active !== "boolean") throw new Error("Invalid published content");
    return { key: record.key, active: record.active, payload: record.active ? payloadSchema(record.key).parse(record.payload) : null };
  });
  return { preferences, pricing, policies, records };
}

export async function publicSite() {
  "use cache";
  cacheTag("managed-website");
  // Next 16.4 needs stale >=300s for the App Shell (30s only allows prerenders).
  // Keep public content in both shells; publication still expires this tag.
  // Server repricing uses the separate uncached readBookingCatalog() above.
  cacheLife({ stale: 300, revalidate: 60, expire: 300 });
  return readPublicSite();
}
export function publishedEntries(snapshot: PublicSiteSnapshot) {
  const entries = { ...siteSeeds };
  for (const record of snapshot.records) {
    if (record.active && record.payload) entries[record.key] = record.payload;
    else if (/^(guide|destination):/.test(record.key)) delete entries[record.key];
  }
  for (const [key, payload] of Object.entries(entries)) entries[key] = materializeContent(payload, snapshot);
  const contact = entries["page:contact"];
  if ((snapshot.preferences.supportEmail || snapshot.preferences.whatsapp) && "sections" in contact) {
    const oldText = "Direct email and telephone support are currently unavailable. This page provides self-service help and does not send enquiries. Never share your sign-in code, password or identity-document scan with an unverified contact.";
    entries["page:contact"] = { ...contact, sections: contact.sections.map(section => ({ ...section, paragraphs: section.paragraphs.map(text => text === oldText ? "Use the approved support channels shown on this page. Keep your order reference handy. Never share your sign-in code, password or identity-document scan with an unverified contact." : text) })) };
  }
  return {
    pages: Object.entries(entries).filter(([key]) => key.startsWith("page:")).map(([, value]) => value as PublicContent),
    guides: Object.entries(entries).filter(([key]) => key.startsWith("guide:")).map(([, value]) => value as Guide),
    destinations: Object.entries(entries).filter(([key]) => key.startsWith("destination:")).map(([, value]) => value as Destination),
  };
}
