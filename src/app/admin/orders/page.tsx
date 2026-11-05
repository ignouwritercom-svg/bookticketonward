import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/workspace";
import { Suspense } from "react";
import Link from "next/link";
import { staffPage } from "@/lib/admin";
import { AdminDenied } from "@/components/admin/access";
import { paymentLabels, fulfilmentLabels } from "@/lib/documents";
import { formatPrice, serviceLabels } from "@/config/business";
import { HotelSummary } from "@/components/booking/hotel-summary";
import type { Order } from "@/lib/account";
import { itinerarySectors } from "@/lib/booking";

type Search = Promise<Record<string, string | string[] | undefined>>;
const dateValid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
async function Orders({ searchParams }: { searchParams: Search }) {
  const { client, allowed, error } = await staffPage("/admin/orders");
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  const input = await searchParams;
  const value = (key: string) => typeof input[key] === "string" ? input[key] as string : "";
  const reference = value("reference").trim().toUpperCase();
  const payment = value("payment"), fulfilment = value("fulfilment"), from = value("from"), to = value("to");
  const page = Number(value("page") || 1);
  const service=value("service"), sort=value("sort") || "newest";
  const valid = ["newest", "oldest"].includes(sort) && (!service || Object.hasOwn(serviceLabels,service)) && (!reference || /^[A-Z0-9-]{1,32}$/.test(reference)) && (!payment || Object.hasOwn(paymentLabels,payment)) && (!fulfilment || Object.hasOwn(fulfilmentLabels,fulfilment)) && (!from || dateValid(from)) && (!to || dateValid(to)) && (!from || !to || from<=to) && Number.isInteger(page) && page>=1 && page<=100000;
  if (!valid) return <section className="account-empty" role="alert"><h1>Check Your Filters</h1><p>Use an order reference and valid dates. The end date must follow the start date.</p><Link href="/admin/orders">Clear filters</Link></section>;
  let query = client.from("orders").select("id,reference,created_at,booking_snapshot,passenger_count,total_minor,currency,payment_status,fulfilment_status", { count: "exact" });
  if (reference) query = query.ilike("reference", `${reference}%`);
  if (payment) query = query.eq("payment_status", payment);
  if (service) query=query.eq("service_type",service);
  if (fulfilment) query = query.eq("fulfilment_status", fulfilment);
  if (from) query = query.gte("created_at", `${from}T00:00:00+05:30`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999999+05:30`);
  const result = await query.order("created_at", { ascending: sort === "oldest" }).order("id", {ascending: sort === "oldest"}).range((page-1)*20,page*20-1);
  if (result.error) throw new Error("Order list unavailable");
  const fresh = await client.rpc("is_booking_staff");
  if (fresh.error || fresh.data !== true) return <AdminDenied />;
  const pageLink = (number: number) => {
    const params = new URLSearchParams({ page: String(number) });
    for(const [key,val] of Object.entries({ reference,payment,fulfilment,from,to,service,sort })) if(val) params.set(key,val);
    return `/admin/orders?${params}`;
  };
  if (page > Math.max(1, Math.ceil((result.count ?? 0) / 20))) redirect(pageLink(Math.max(1, Math.ceil((result.count ?? 0) / 20))));
  return <><AdminHeader title="Orders" intro="Find reservation requests, prioritise paid preparation and open the full order workspace." /><nav className="ops-tabs" aria-label="Order queues"><Link href="/admin/orders" prefetch={false}>All requests</Link><Link href="/admin/orders?payment=paid&fulfilment=not_started&sort=oldest" prefetch={false}>Ready to start</Link><Link href="/admin/orders?payment=paid&fulfilment=processing&sort=oldest" prefetch={false}>In preparation</Link><Link href="/admin/orders?payment=awaiting_payment" prefetch={false}>Awaiting payment</Link></nav>
    <details className="account-card ops-filter-panel" open><summary>Filter & sort orders</summary><form action="/admin/orders" className="admin-filters">
      <div><label htmlFor="admin-order-service">Service</label><select id="admin-order-service" name="service" defaultValue={service}><option value="">All services</option>{Object.entries(serviceLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
      <div><label htmlFor="admin-order-reference">Order reference</label><input id="admin-order-reference" name="reference" defaultValue={reference} maxLength={32} placeholder="DT-…" /></div>
      <div><label htmlFor="admin-order-payment">Payment</label><select id="admin-order-payment" name="payment" defaultValue={payment}><option value="">All payments</option>{Object.entries(paymentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
      <div><label htmlFor="admin-order-fulfilment">Fulfilment</label><select id="admin-order-fulfilment" name="fulfilment" defaultValue={fulfilment}><option value="">All stages</option>{Object.entries(fulfilmentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
      <div><label htmlFor="admin-order-from">Created from (IST)</label><input id="admin-order-from" type="date" name="from" defaultValue={from} /></div>
      <div><label htmlFor="admin-order-to">Created through (IST)</label><input id="admin-order-to" type="date" name="to" defaultValue={to} /></div>
      <div><label htmlFor="admin-order-sort">Sort by</label><select id="admin-order-sort" name="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
      <div className="account-actions"><button type="submit" className="button button-primary">Apply filters</button><Link href="/admin/orders">Clear</Link></div>
    </form></details>
    <p>{result.count ?? 0} matching orders · Page {page}</p>
    {!result.data.length && <div className="account-empty">No orders match these filters.</div>}
    {(result.data as Order[]).map(order => <article className="account-card ops-order-record" key={order.id}>
      <header><h2><Link href={`/admin/orders/${order.id}`} prefetch={false}>{order.reference}</Link></h2><span>{new Date(order.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST</span></header>
      <p><strong>{serviceLabels[order.booking_snapshot.service ?? "flight"]}</strong></p>
      {order.booking_snapshot.service!=="hotel" && <p>{itinerarySectors(order.booking_snapshot.trip).map(s=>`${s.from} → ${s.to}`).join(" · ")}</p>}
      {order.booking_snapshot.service && order.booking_snapshot.service!=="flight" && <HotelSummary hotels={order.booking_snapshot.hotels ?? []} />}
      <dl><div><dt>Passengers</dt><dd>{order.passenger_count}</dd></div><div><dt>Amount</dt><dd>{formatPrice(order.total_minor)} {order.currency}</dd></div><div><dt>Payment</dt><dd>{paymentLabels[order.payment_status]}</dd></div><div><dt>Fulfilment</dt><dd>{fulfilmentLabels[order.fulfilment_status]}</dd></div><div><dt>Preferred channel</dt><dd>{order.booking_snapshot.communication.channel === "whatsapp" ? "WhatsApp" : "Email"}</dd></div></dl>
      <Link className="text-link" href={`/admin/orders/${order.id}`} prefetch={false}>Open order details</Link>
    </article>)}
    <nav className="account-actions" aria-label="Order pages">{page>1 && <Link href={pageLink(page-1)} prefetch={false}>Previous page</Link>}{page*20<(result.count??0) && <Link href={pageLink(page+1)} prefetch={false}>Next page</Link>}</nav>
  </>;
}
export default function OrdersPage({ searchParams }: { searchParams: Search }) { return <Suspense fallback={<p role="status">Loading private orders…</p>}><Orders searchParams={searchParams} /></Suspense>; }
