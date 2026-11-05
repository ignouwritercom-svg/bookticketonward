import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingDraft } from "./booking";
import type { Order, SavedDraft } from "./account";
import type { BookingSummary, WorkspaceCounts, WorkspaceDocument, WorkspacePage, WorkspaceQuery } from "./workspace";

const pageSize = 12;
function summary(id: string, booking: BookingDraft, updatedAt: string): BookingSummary {
  const service = booking.service ?? "flight";
  const first = booking.trip.sectors[0];
  const stay = booking.hotels?.[0];
  const stays = booking.hotels?.length ?? 0;
  const stayCount = `${stays} hotel ${stays === 1 ? "stay" : "stays"}`;
  return { id, service, updatedAt, travellers: booking.passengers.length,
    title: service === "hotel" ? [stay?.city, stay?.country].filter(Boolean).join(", ") || "Hotel reservation" : first ? `${first.from} → ${first.to}` : "Flight reservation",
    description: service === "hotel" ? stayCount : `${booking.trip.type === "return" ? "Return journey" : booking.trip.type === "multi-city" ? `${booking.trip.sectors.length} flight sectors` : "One-way journey"}${service === "combo" ? ` · ${stayCount}` : ""}`,
    travelDate: service === "hotel" ? stay?.checkIn ?? "" : first?.departure ?? "",
  };
}

// Every read uses the customer's session client AND an explicit owner filter.
// No service-role/Storage client is used for dashboard reads.
export async function workspacePage(client: SupabaseClient, owner: string, input: WorkspaceQuery, clamp = true): Promise<WorkspacePage> {
  const offset = (input.page - 1) * pageSize;
  const result: WorkspacePage = { view: input.view, page: input.page, pageSize, total: 0, orders: [], drafts: [], documents: [] };
  if (input.view === "orders") {
    let query = client.from("orders").select("id,reference,created_at,booking_snapshot,total_minor,currency,payment_status,fulfilment_status", { count: "exact" }).eq("owner_id", owner);
    if (input.service !== "all") query = query.eq("service_type", input.service);
    if (input.reference) query = query.ilike("reference", `${input.reference.toUpperCase()}%`);
    if (input.status === "paid" || input.status === "awaiting_payment") query = query.eq("payment_status", input.status);
    else if (input.status !== "all") query = query.eq("payment_status", "paid").eq("fulfilment_status", input.status);
    const { data, count, error } = await query.order("created_at", { ascending: input.sort === "oldest" }).order("id", { ascending: input.sort === "oldest" }).range(offset, offset + pageSize - 1);
    if (error || count === null) throw new Error("Order history unavailable");
    result.total = count;
    result.orders = (data as Order[]).map(order => ({ ...summary(order.id, order.booking_snapshot, order.created_at), reference: order.reference, totalMinor: order.total_minor, currency: order.currency, payment: order.payment_status, fulfilment: order.fulfilment_status }));
  } else if (input.view === "drafts") {
    let query = client.from("booking_drafts").select("id,data,updated_at", { count: "exact" }).eq("owner_id", owner).eq("status", "draft");
    if (input.service === "flight") query = query.or("data->>service.eq.flight,data->>service.is.null");
    else if (input.service !== "all") query = query.eq("data->>service", input.service);
    const { data, count, error } = await query.order("updated_at", { ascending: input.sort === "oldest" }).order("id", { ascending: input.sort === "oldest" }).range(offset, offset + pageSize - 1);
    if (error || count === null) throw new Error("Saved drafts unavailable");
    result.total = count;
    result.drafts = (data as SavedDraft[]).map(draft => summary(draft.id, draft.data, draft.updated_at));
  } else {
    let query = client.from("order_documents").select("id,order_id,kind,version,size_bytes,published_at,orders!inner(id,owner_id,reference,payment_status,service_type)", { count: "exact" })
      .eq("orders.owner_id", owner).eq("orders.payment_status", "paid").eq("state", "ready").not("published_at", "is", null).is("withdrawn_at", null);
    if (input.service !== "all") query = query.eq("orders.service_type", input.service);
    if (input.reference) query = query.ilike("orders.reference", `${input.reference.toUpperCase()}%`);
    const { data, count, error } = await query.order("published_at", { ascending: input.sort === "oldest" }).order("id", { ascending: input.sort === "oldest" }).range(offset, offset + pageSize - 1);
    if (error || count === null) throw new Error("Document library unavailable");
    result.total = count;
    const rows = data as unknown as (Omit<WorkspaceDocument, "reference" | "orderId" | "sizeBytes" | "publishedAt"> & { order_id: string; size_bytes: number; published_at: string; orders: { id: string; owner_id: string; reference: string; payment_status: string } })[];
    // Defense in depth for staff sessions, whose RLS visibility is broader.
    result.documents = rows.filter(row => row.orders?.owner_id === owner && row.orders.payment_status === "paid").map(row => ({ id: row.id, orderId: row.order_id, reference: row.orders.reference, kind: row.kind, version: row.version, sizeBytes: row.size_bytes, publishedAt: row.published_at }));
  }
  const last = Math.max(1, Math.ceil(result.total / pageSize));
  if (clamp && input.page > last) return workspacePage(client, owner, { ...input, page: last }, false);
  return result;
}

export async function workspaceCounts(client: SupabaseClient, owner: string): Promise<WorkspaceCounts> {
  const orders = () => client.from("orders").select("id", { head: true, count: "exact" }).eq("owner_id", owner);
  const queries = [orders(), client.from("booking_drafts").select("id", { head: true, count: "exact" }).eq("owner_id", owner).eq("status", "draft"), orders().eq("payment_status", "awaiting_payment"), orders().eq("payment_status", "paid").in("fulfilment_status", ["not_started", "processing"]),
    client.from("order_documents").select("id,orders!inner(owner_id,payment_status)", { head: true, count: "exact" }).eq("orders.owner_id", owner).eq("orders.payment_status", "paid").eq("state", "ready").not("published_at", "is", null).is("withdrawn_at", null),
    client.from("order_notifications").select("id", { head: true, count: "exact" }).eq("owner_id", owner).is("read_at", null)];
  const results = await Promise.allSettled(queries);
  const value = (index: number) => { const item = results[index]; return item.status === "fulfilled" && !item.value.error ? item.value.count : null; };
  return { orders: value(0), drafts: value(1), awaiting: value(2), processing: value(3), documents: value(4), unread: value(5) };
}
