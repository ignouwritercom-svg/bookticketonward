import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Files, PanelsTopLeft, Settings2, AlertCircle, CircleCheck, Mail, Users, Tags } from "lucide-react";
import { staffPage } from "@/lib/admin";
import { adminMetrics, confirmStaff } from "@/lib/admin-workspace";
import { AdminDenied } from "@/components/admin/access";
import { AdminHeader } from "@/components/admin/workspace";
import { formatPrice, serviceLabels } from "@/config/business";
import type { Order } from "@/lib/account";

export const metadata = { title: "Operations Overview | DummyTicket" };

async function Overview() {
  const { client, allowed, error } = await staffPage("/admin");
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  const [counts, queue, notifications] = await Promise.all([
    adminMetrics(client),
    client.from("orders").select("id,reference,created_at,booking_snapshot,total_minor,currency,payment_status,fulfilment_status").eq("payment_status", "paid").in("fulfilment_status", ["not_started", "processing"]).order("created_at", { ascending: true }).order("id", { ascending: true }).limit(6),
    client.rpc("admin_notification_log", { p_page: 1, p_failed: true }),
  ]);
  if (!await confirmStaff(client)) return <AdminDenied />;
  const metrics = [
    { label: "Total orders", count: counts[0], href: "/admin/orders", text: "All reservation requests" },
    { label: "Awaiting payment", count: counts[1], href: "/admin/orders?payment=awaiting_payment", text: "Outside the preparation queue" },
    { label: "Ready to start", count: counts[2], href: "/admin/orders?payment=paid&fulfilment=not_started&sort=oldest", text: "Paid orders needing attention" },
    { label: "In preparation", count: counts[3], href: "/admin/orders?payment=paid&fulfilment=processing&sort=oldest", text: "Work already underway" },
  ];
  const modules = [
    { title: "Reservations", intro: "Handle a request from order review to document publication.", items: [
      { icon: ClipboardList, title: "Manage orders", text: "Filter requests and open the full preparation workspace.", href: "/admin/orders" },
      { icon: Files, title: "Document library", text: "Review private versions, publications and upload exceptions.", href: "/admin/documents" },
      { icon: Users, title: "Customer directory", text: "Find an account and review its submitted order history.", href: "/admin/customers" },
    ] },
    { title: "Website & Business", intro: "Prepare changes privately, review them and publish when approved.", items: [
      { icon: PanelsTopLeft, title: "Website content", text: "Manage public pages, FAQs, guides and destinations.", href: "/admin/content" },
      { icon: Settings2, title: "Website & support", text: "Edit homepage copy, approved contacts and working times.", href: "/admin/editor/settings--site" },
      { icon: Tags, title: "Pricing & policies", text: "Review service fees and booking acceptance settings.", href: "/admin/settings" },
    ] },
  ];
  return <>
    <AdminHeader title="Operations Overview" intro="Start with paid requests, resolve exceptions and keep your website up to date." />
    <section className="ops-metrics" aria-label="Operational totals">{metrics.map(metric => <Link className="ops-metric" key={metric.label} href={metric.href} prefetch={false}><span>{metric.label}</span><strong>{metric.count ?? "—"}</strong><p>{metric.count === null ? "Temporarily unavailable" : metric.text}</p></Link>)}</section>
    <nav className="ops-workflow" aria-label="Reservation workflow">{[
      { title: "Review requests", text: "Check details and payment status", href: "/admin/orders" },
      { title: "Prepare documents", text: "Work on verified paid orders", href: "/admin/orders?payment=paid&sort=oldest" },
      { title: "Review & publish", text: "Inspect each private PDF version", href: "/admin/documents" },
    ].map((item, index) => <Link href={item.href} prefetch={false} key={item.title}><span className="ops-step-number" aria-hidden="true">{index + 1}</span><span><strong>{item.title}</strong><small>{item.text}</small></span></Link>)}</nav>
    <div className="ops-dashboard-grid">
      <section className="ops-priority" aria-labelledby="ops-priority-title"><div className="ops-section-heading"><div><p className="eyebrow">Oldest paid requests first</p><h2 id="ops-priority-title">Preparation queue</h2></div><Link className="text-link" href="/admin/orders?payment=paid&sort=oldest" prefetch={false}>View queue<ArrowRight size={16} aria-hidden="true" /></Link></div>
        {queue.error ? <p className="ops-notice" role="alert">The preparation queue could not be loaded. Refresh to retry.</p> : queue.data.length ? <div className="ops-queue">{(queue.data as Order[]).map(order => <Link href={`/admin/orders/${order.id}`} prefetch={false} key={order.id}><span className="ops-queue-icon"><ClipboardList size={20} aria-hidden="true" /></span><span><strong>{order.reference}</strong><small>{serviceLabels[order.booking_snapshot.service ?? "flight"]} · {new Date(order.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</small></span><b>{formatPrice(order.total_minor)}</b><ArrowRight size={16} aria-hidden="true" /></Link>)}</div> : <div className="ops-empty"><CircleCheck size={28} aria-hidden="true" /><h3>No paid requests waiting here</h3><p>Unpaid orders stay outside this queue. New work appears after verified payment.</p></div>}
      </section>
      <section className="ops-review-panel" aria-labelledby="ops-review-title"><header><p className="eyebrow">Check & resolve</p><h2 id="ops-review-title">Needs attention</h2></header>{[
        { title: "Pending uploads", text: "Review incomplete confirmations", count: counts[6], href: "/admin/documents?state=pending", icon: AlertCircle },
        { title: "Notification failures", text: "Inspect delivery attempts before retrying", count: notifications.error ? null : notifications.data.failed_count, href: "/admin/notifications?failed=true", icon: Mail },
        { title: "Documents ready", text: "Review published versions and delivery", count: counts[4], href: "/admin/orders?payment=paid&fulfilment=documents_ready", icon: CircleCheck },
      ].map(({ icon: Icon, ...item }) => <Link href={item.href} prefetch={false} key={item.title}><Icon size={20} aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.count === null ? "Count temporarily unavailable" : item.text}</small></span><b>{item.count ?? "—"}</b></Link>)}</section>
    </div>
    {modules.map(module => <section key={module.title} aria-label={module.title}><div className="ops-module-heading"><h2>{module.title}</h2><p>{module.intro}</p></div><div className="ops-shortcuts">{module.items.map(({ icon: Icon, ...item }) => <Link href={item.href} className="ops-shortcut" prefetch={false} key={item.href}><Icon size={23} aria-hidden="true" /><h3>{item.title}</h3><p>{item.text}</p><span>Open section<ArrowRight size={15} aria-hidden="true" /></span></Link>)}</div></section>)}
    <p className="ops-notice">Payment collection is on hold. This workspace cannot manually mark an order paid. Document publication and external delivery remain separate, authorized actions.</p>
  </>;
}
export default function AdminPage() { return <Suspense fallback={<p role="status">Loading operational totals…</p>}><Overview /></Suspense>; }
