import { Suspense } from "react";
import Link from "next/link";
import { FilePenLine, Plus } from "lucide-react";
import { staffPage } from "@/lib/admin";
import { confirmStaff, editorPath } from "@/lib/admin-workspace";
import { siteSeeds } from "@/lib/site-defaults";
import { AdminDenied } from "@/components/admin/access";
import { AdminHeader, ManagementSetup } from "@/components/admin/workspace";
import type { ManagedRecord } from "@/lib/site-management";
type Props = { searchParams: Promise<{ kind?: string }> };
async function Library({ searchParams }: Props) {
  const { client, allowed, error } = await staffPage("/admin/content");
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  const result = await client.rpc("admin_site_list");
  if (!await confirmStaff(client)) return <AdminDenied />;
  const kind = ["page", "guide", "destination"].includes((await searchParams).kind ?? "") ? (await searchParams).kind : "all";
  const records = (result.data ?? []) as (Omit<ManagedRecord, "draft" | "published"> & { title?: string })[];
  const keys = [...new Set([...Object.keys(siteSeeds), ...records.map(record => record.key)])].filter(key => /^(page|guide|destination):/.test(key) && (kind === "all" || key.startsWith(`${kind}:`))).sort();
  return <><AdminHeader title="Website Content" intro="Edit public pages, FAQs, planning guides and destination information without changing code." />{result.error ? <ManagementSetup /> : <><div className="ops-toolbar"><Link className="button button-primary" href="/admin/content/new" prefetch={false}><Plus size={17} aria-hidden="true" />New guide or destination</Link><Link className="text-link" href="/admin/settings" prefetch={false}>Homepage, contacts and pricing →</Link></div><nav className="ops-tabs" aria-label="Content types">{[{ value: "all", label: "All content" }, { value: "page", label: "Website pages" }, { value: "guide", label: "Guides" }, { value: "destination", label: "Destinations" }].map(item => <Link href={item.value === "all" ? "/admin/content" : `/admin/content?kind=${item.value}`} key={item.value} prefetch={false} aria-current={kind === item.value ? "page" : undefined}>{item.label}</Link>)}</nav><div className="ops-library">{keys.map(key => { const record = records.find(record => record.key === key), seed = siteSeeds[key]; return <article className="ops-library-card" key={key}><FilePenLine size={23} aria-hidden="true" /><h2>{record?.title ?? (seed && "title" in seed ? seed.title : key.split(":")[1].replaceAll("-", " "))}</h2><p>{key.startsWith("page:") ? "Website page" : key.startsWith("guide:") ? "Planning guide" : "Destination guidance"} · /{key.replace("page:", "").replace("guide:", "guides/").replace("destination:", "destinations/")}</p><span className={`ops-badge${record?.active ? " ops-badge-live" : record ? " ops-badge-draft" : ""}`}>{record?.active ? record.revision > (record.published_revision ?? 0) ? "Published · newer saved revision" : "Published" : record?.published_revision ? "Withdrawn" : record ? "Draft" : "Repository default"}</span><div className="ops-toolbar"><Link className="text-link" href={editorPath(key)} prefetch={false}>Open editor →</Link></div></article>; })}</div><p className="ops-notice">Publishing uses reviewed, plain-text content. Do not invent visa requirements, authors, legal details, reviews or service guarantees. Core page URLs and visual layouts remain fixed; guides and destination articles can be added separately.</p></>}</>;
}
export default function Page(props: Props) { return <Suspense fallback={<p role="status">Loading managed content…</p>}><Library {...props} /></Suspense>; }
