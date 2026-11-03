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
  const service=value("service");
  const valid = (!service || Object.hasOwn(serviceLabels,service)) && (!reference || /^[A-Z0-9-]{1,32}$/.test(reference)) && (!payment || Object.hasOwn(paymentLabels,payment)) && (!fulfilment || Object.hasOwn(fulfilmentLabels,fulfilment)) && (!from || dateValid(from)) && (!to || dateValid(to)) && (!from || !to || from<=to) && Number.isInteger(page) && page>=1 && page<=100000;
  if (!valid) return <section className="account-empty" role="alert"><h1>Check your filters</h1><p>Use an order reference and valid dates. The end date must follow the start date.</p><Link href="/admin/orders">Clear filters</Link></section>;
  let query = client.from("orders").select("id,reference,created_at,booking_snapshot,passenger_count,total_minor,currency,payment_status,fulfilment_status", { count: "exact" });
  if (reference) query = query.ilike("reference", `${reference}%`);
  if (payment) query = query.eq("payment_status", payment);
  if (service) query=query.eq("service_type",service);
  if (fulfilment) query = query.eq("fulfilment_status", fulfilment);
  if (from) query = query.gte("created_at", `${from}T00:00:00+05:30`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999999+05:30`);
  const result = await query.order("created_at", { ascending: false }).order("id", {ascending: false}).range((page-1)*20,page*20-1);
  if (result.error) throw new Error("Order list unavailable");
  const fresh = await client.rpc("is_booking_staff");
  if (fresh.error || fresh.data !== true) return <AdminDenied />;
  const pageLink = (number: number) => {
    const params = new URLSearchParams({ page: String(number) });
    for(const [key,val] of Object.entries({ reference,payment,fulfilment,from,to,service })) if(val) params.set(key,val);
    return `/admin/orders?${params}`;
  };
  return <><p className="eyebrow">STAFF DESK</p><h1>Orders</h1>
    <form action="/admin/orders" className="account-card admin-filters">
      <label>Service<select name="service" defaultValue={service}><option value="">All services</option>{Object.entries(serviceLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Order reference<input name="reference" defaultValue={reference} maxLength={32} placeholder="DT-…" /></label>
      <label>Payment<select name="payment" defaultValue={payment}><option value="">All payments</option>{Object.entries(paymentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Fulfilment<select name="fulfilment" defaultValue={fulfilment}><option value="">All stages</option>{Object.entries(fulfilmentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Created from (IST)<input type="date" name="from" defaultValue={from} /></label>
      <label>Created through (IST)<input type="date" name="to" defaultValue={to} /></label>
      <div className="account-actions"><button type="submit" className="button button-primary">Apply filters</button><Link href="/admin/orders">Clear</Link></div>
    </form>
    <p>{result.count ?? 0} matching orders · Page {page}</p>
    {!result.data.length && <div className="account-empty">No orders match these filters.</div>}
    {(result.data as Order[]).map(order => <article className="account-card" key={order.id}>
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
