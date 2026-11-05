import { Suspense } from "react";
import Link from "next/link";
import { staffPage } from "@/lib/admin";
import { confirmStaff } from "@/lib/admin-workspace";
import { uuidPattern } from "@/lib/account";
import { AdminDenied } from "@/components/admin/access";
import { AdminHeader } from "@/components/admin/workspace";
import { formatPrice } from "@/config/business";
import { paymentLabels, fulfilmentLabels } from "@/lib/documents";
type Props = { params: Promise<{ customerId: string }>; searchParams: Promise<{ page?: string }> };
async function Customer({ params, searchParams }: Props) {
  const { customerId } = await params;
  const { client, allowed, error } = await staffPage(`/admin/customers/${customerId}`);
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  const page = Number((await searchParams).page || 1);
  if (!uuidPattern.test(customerId) || !Number.isInteger(page) || page < 1 || page > 10000) return <h1>Customer Unavailable</h1>;
  const result = await client.from("orders").select("id,reference,account_email,created_at,total_minor,payment_status,fulfilment_status", { count: "exact" }).eq("owner_id", customerId).order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
  if (!await confirmStaff(client)) return <AdminDenied />;
  if (result.error || result.count === null) throw new Error("Customer orders unavailable");
  return <><Link className="text-link ops-detail-back" href="/admin/customers" prefetch={false}>← Customer directory</Link><AdminHeader title="Customer Orders" intro="Submitted orders for this account. Open an order to review its traveller and delivery details." />{result.data.length > 0 && <p className="ops-notice">{result.data[0].account_email} · {result.count} orders</p>}<div className="ops-library">{result.data.map(order => <article className="ops-library-card" key={order.id}><h2>{order.reference}</h2><p>{paymentLabels[order.payment_status as keyof typeof paymentLabels]} · {fulfilmentLabels[order.fulfilment_status as keyof typeof fulfilmentLabels]}</p><p>{formatPrice(order.total_minor)} · {new Date(order.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p><Link className="text-link" href={`/admin/orders/${order.id}`} prefetch={false}>Open order →</Link></article>)}</div>{!result.data.length && <div className="ops-empty">No orders are available on this page.</div>}<nav className="ops-toolbar" aria-label="Customer order pages">{page > 1 && <Link href={`/admin/customers/${customerId}?page=${page - 1}`} prefetch={false}>Previous</Link>}{page * 20 < result.count && <Link href={`/admin/customers/${customerId}?page=${page + 1}`} prefetch={false}>Next</Link>}</nav></>;
}
export default function Page(props: Props) { return <Suspense fallback={<p role="status">Loading customer orders…</p>}><Customer {...props} /></Suspense>; }
