import { Suspense } from "react";
import Link from "next/link";
import { staffPage } from "@/lib/admin";
import { AdminDenied } from "@/components/admin/access";
import { LogoutButton } from "@/components/account/auth";

async function Overview() {
  const { client, allowed, error } = await staffPage("/admin");
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  const definitions = [
    ["Awaiting payment", "awaiting_payment", null],
    ["Paid and awaiting fulfilment", "paid", "not_started"],
    ["Processing", "paid", "processing"],
    ["Documents ready", "paid", "documents_ready"],
    ["Delivered", "paid", "delivered"],
  ] as const;
  const counts = await Promise.all(definitions.map(async ([, payment, fulfilment]) => {
    let query = client.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", payment);
    if (fulfilment) query = query.eq("fulfilment_status", fulfilment);
    return query;
  }));
  if (counts.some(result => result.error)) throw new Error("Admin counts unavailable");
  const notifications = await client.rpc("admin_notification_log", { p_page: 1, p_failed: true });
  // Do not display a partial customer-scoped result if access was revoked mid-read.
  const fresh = await client.rpc("is_booking_staff");
  if (fresh.error || fresh.data !== true) return <AdminDenied />;
  return <><div className="account-heading"><div><p className="eyebrow">STAFF DESK</p><h1>Order overview</h1></div><LogoutButton /></div>
    <p>Payment confirmation is not enabled yet. Unpaid orders cannot enter fulfilment.</p>
    <div className="admin-stats">{definitions.map(([label,payment,fulfilment],index) => <Link className="account-card" key={label} href={`/admin/orders?payment=${payment}${fulfilment ? `&fulfilment=${fulfilment}` : ""}`} prefetch={false}><h2>{label}</h2><strong>{counts[index].count ?? 0}</strong></Link>)}</div>
    <Link className="button button-primary" href="/admin/orders" prefetch={false}>Manage orders</Link>
    <section className="account-card"><h2>Notification alerts</h2><p>{notifications.error ? "Notification log unavailable; check notification setup." : `${notifications.data.failed_count} failed notification(s) need review.`}</p><Link className="text-link" href="/admin/notifications?failed=true" prefetch={false}>Review notification failures</Link><p>Only paid orders awaiting fulfilment are operational tasks. Unpaid orders remain outside that queue.</p></section>
  </>;
}
export default function AdminPage() { return <Suspense fallback={<p role="status">Loading order counts…</p>}><Overview /></Suspense>; }
