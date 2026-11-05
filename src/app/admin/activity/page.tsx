import { Suspense } from "react";
import Link from "next/link";
import { staffPage } from "@/lib/admin";
import { confirmStaff, editorPath } from "@/lib/admin-workspace";
import { AdminDenied } from "@/components/admin/access";
import { AdminHeader } from "@/components/admin/workspace";
type Props = { searchParams: Promise<{ page?: string }> };
async function Activity({ searchParams }: Props) {
  const { client, allowed, error } = await staffPage("/admin/activity");
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  const number = Number((await searchParams).page || 1), page = Number.isInteger(number) && number > 0 && number <= 10000 ? number : 1;
  const [audit, site] = await Promise.all([client.from("order_audit").select("id,order_id,event,actor_id,created_at,orders!inner(reference)").order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 30, page * 30), client.rpc("admin_site_list")]);
  if (!await confirmStaff(client)) return <AdminDenied />;
  const rows = (audit.data ?? []) as unknown as { id: string; order_id: string; event: string; actor_id: string; created_at: string; orders: { reference: string } }[];
  return <><AdminHeader title="Staff Activity" intro="Review order operations and recently updated website records. Full revisions and order audits remain on their respective detail screens." /><section className="ops-editor"><h2>Order operation audit</h2>{audit.error ? <p className="ops-error" role="alert">Order audit unavailable. Refresh to retry.</p> : rows.length ? rows.slice(0, 30).map(row => <article className="ops-audit-row" key={row.id}><h3>{row.event.replaceAll("_", " ")}</h3><p><Link className="text-link" href={`/admin/orders/${row.order_id}`} prefetch={false}>{row.orders.reference}</Link> · {new Date(row.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p><p>Staff {row.actor_id}</p></article>) : <p>No audit events on this page.</p>}<nav className="ops-toolbar" aria-label="Audit pages">{page > 1 && <Link href={`/admin/activity?page=${page - 1}`} prefetch={false}>Previous</Link>}{rows.length > 30 && <Link href={`/admin/activity?page=${page + 1}`} prefetch={false}>Next</Link>}</nav></section><section className="ops-editor"><h2>Recently updated website records</h2>{site.error ? <p>Website history is unavailable until management setup is complete.</p> : site.data.length ? site.data.slice(0, 10).map((record: { key: string; revision: number; updated_at: string }) => <article className="ops-audit-row" key={record.key}><h3><Link className="text-link" href={editorPath(record.key)} prefetch={false}>{record.key}</Link></h3><p>Revision {record.revision} · {new Date(record.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p><p>Open Revision history for the actor, action and saved content.</p></article>) : <p>No website revisions saved yet.</p>}</section></>;
}
export default function Page(props: Props) { return <Suspense fallback={<p role="status">Loading private staff activity…</p>}><Activity {...props} /></Suspense>; }
