import { Suspense } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { staffPage } from "@/lib/admin";
import { confirmStaff } from "@/lib/admin-workspace";
import { AdminDenied } from "@/components/admin/access";
import { AdminHeader } from "@/components/admin/workspace";
import { documentKindLabels, type OrderDocument } from "@/lib/documents";
type Search = Promise<Record<string, string | string[] | undefined>>;
async function Documents({ searchParams }: { searchParams: Search }) {
  const session = await staffPage("/admin/documents");
  if (!session.client || !session.allowed) return <AdminDenied unavailable={!session.client || session.error} />;
  const { client } = session;
  const input = await searchParams;
  const value = (key: string) => typeof input[key] === "string" ? input[key] as string : "";
  const state = value("state"), reference = value("reference").trim().toUpperCase(), page = Number(value("page") || 1);
  if (!["", "private", "published", "withdrawn", "pending", "failed"].includes(state) || !/^[A-Z0-9-]{0,32}$/.test(reference) || !Number.isInteger(page) || page < 1 || page > 10000) return <><AdminHeader title="Check Your Document Filters" intro="Use a valid order reference and document state." /><Link href="/admin/documents">Clear filters</Link></>;
  let query = client.from("order_documents").select("id,order_id,kind,version,state,size_bytes,created_at,published_at,withdrawn_at,orders!inner(reference)", { count: "exact" });
  if (reference) query = query.ilike("orders.reference", `${reference}%`);
  if (["pending", "failed"].includes(state)) query = query.eq("state", state);
  if (state === "withdrawn") query = query.not("withdrawn_at", "is", null);
  if (state === "private") query = query.eq("state", "ready").is("published_at", null).is("withdrawn_at", null);
  if (state === "published") query = query.eq("state", "ready").not("published_at", "is", null).is("withdrawn_at", null);
  const result = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
  if (!await confirmStaff(client)) return <AdminDenied />;
  if (result.error || result.count === null) throw new Error("Document library unavailable");
  const href = (number: number) => `/admin/documents?${new URLSearchParams({ state, reference, page: String(number) })}`;
  type Row = OrderDocument & { orders: { reference: string } };
  const rows = result.data as unknown as Row[];
  return <><AdminHeader title="Document Library" intro="Review private uploads, published versions and document exceptions across orders." /><form action="/admin/documents" className="account-card admin-filters"><label>Order reference<input name="reference" maxLength={32} defaultValue={reference} placeholder="DT-…" /></label><label>Document state<select name="state" defaultValue={state}><option value="">All document states</option><option value="private">Private, ready for review</option><option value="published">Published</option><option value="withdrawn">Withdrawn</option><option value="pending">Pending confirmation</option><option value="failed">Failed upload</option></select></label><div className="ops-toolbar"><button type="submit" className="button button-primary">Apply filters</button><Link href="/admin/documents" className="text-link">Reset</Link></div></form><p className="ops-save-state">{result.count} versions · Page {page} of {Math.max(1, Math.ceil(result.count / 20))}</p><div className="ops-library">{rows.map(document => <article className="ops-library-card" key={document.id}><FileText size={25} aria-hidden="true" /><h2>{documentKindLabels[document.kind ?? "flight"]}</h2><p><Link className="text-link" href={`/admin/orders/${document.order_id}`} prefetch={false}>{document.orders.reference}</Link> · Version {document.version}</p><span className={`ops-badge${state === "published" || document.published_at && !document.withdrawn_at ? " ops-badge-live" : ""}`}>{document.state !== "ready" ? document.state === "pending" ? "Pending confirmation" : "Failed upload" : document.withdrawn_at ? "Withdrawn" : document.published_at ? "Published" : "Private"}</span><p>{Math.ceil(document.size_bytes / 1024)} KB · {new Date(document.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p><div className="ops-toolbar">{document.state === "ready" && <a className="button button-secondary" href={`/api/documents/${document.id}`} download>Review PDF</a>}<Link className="text-link" href={`/admin/orders/${document.order_id}`} prefetch={false}>Manage in order →</Link></div></article>)}</div>{!rows.length && <div className="ops-empty"><h2>No versions match these filters</h2><p>Open a paid order to start preparation and upload a private PDF.</p></div>}<nav className="ops-toolbar" aria-label="Document pages">{page > 1 && <Link className="button button-secondary" href={href(page - 1)} prefetch={false}>Previous</Link>}{page * 20 < result.count && <Link className="button button-secondary" href={href(page + 1)} prefetch={false}>Next</Link>}</nav><p className="ops-notice">Publish, withdraw and manual delivery actions stay on the individual order, where payment, staff access and document state are rechecked.</p></>;
}
export default function Page(props: { searchParams: Search }) { return <Suspense fallback={<p role="status">Loading protected document library…</p>}><Documents {...props} /></Suspense>; }
