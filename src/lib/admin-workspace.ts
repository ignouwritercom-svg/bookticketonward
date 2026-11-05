import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
export async function confirmStaff(client: SupabaseClient) { const result = await client.rpc("is_booking_staff"); return !result.error && result.data === true; }
export const editorPath = (key: string) => `/admin/editor/${key.replace(":", "--")}`;
export const editorKey = (segment: string) => segment.replace("--", ":");
export async function adminMetrics(client: SupabaseClient) {
  const base = () => client.from("orders").select("id", { count: "exact", head: true });
  const results = await Promise.allSettled([base(), base().eq("payment_status", "awaiting_payment"), base().eq("payment_status", "paid").eq("fulfilment_status", "not_started"), base().eq("payment_status", "paid").eq("fulfilment_status", "processing"), base().eq("payment_status", "paid").eq("fulfilment_status", "documents_ready"), base().eq("payment_status", "paid").eq("fulfilment_status", "delivered"), client.from("order_documents").select("id", { head: true, count: "exact" }).eq("state", "pending")]);
  return results.map(result => result.status === "fulfilled" && !result.value.error ? result.value.count : null);
}
