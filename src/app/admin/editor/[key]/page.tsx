import { Suspense } from "react";
import Link from "next/link";
import { staffPage } from "@/lib/admin";
import { confirmStaff, editorKey } from "@/lib/admin-workspace";
import { managementKey, type SitePayload } from "@/lib/site-management";
import { siteSeeds } from "@/lib/site-defaults";
import { siteManagementEnabled } from "@/lib/site-content";
import { AdminDenied } from "@/components/admin/access";
import { AdminHeader, ManagementSetup } from "@/components/admin/workspace";
import { ContentEditor } from "@/components/admin/content-editor";
import { editorialToday } from "@/lib/site-runtime";
type Props = { params: Promise<{ key: string }> };
async function Editor({ params }: Props) {
  const { key: segment } = await params, key = editorKey(segment);
  const { client, allowed, error } = await staffPage(`/admin/editor/${segment}`);
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  if (!managementKey.safeParse(key).success || key.startsWith("page:") && !siteSeeds[key]) return <h1>Editor Unavailable</h1>;
  const [result, live] = await Promise.all([client.rpc("admin_site_record", { p_key: key }), client.rpc("public_site_snapshot")]);
  if (!await confirmStaff(client)) return <AdminDenied />;
  const today = editorialToday();
  const blank = { slug: key.split(":")[1], title: "", description: "", intro: "", reviewed: today, sections: [{ heading: "", paragraphs: [""] }], related: [], draft: true };
  let seed: SitePayload = siteSeeds[key] ?? (key.startsWith("guide:") ? { ...blank, excerpt: "", published: today, sources: [], relatedGuideSlugs: [] } : { ...blank, country: "", sources: [{ title: "", url: "" }], guideSlugs: [] });
  if (!live.error && key === "pricing:catalog") seed = live.data.pricing;
  if (!live.error && key === "policies:booking") seed = { flightText: live.data.policies.flight.text, reservationText: live.data.policies.reservation.text };
  const title = key === "settings:site" ? "Website Settings" : key === "pricing:catalog" ? "Service Pricing" : key === "policies:booking" ? "Booking Acceptance Policies" : "Content Editor";
  return <><Link className="text-link ops-detail-back" href={/^(settings|pricing|policies):/.test(key) ? "/admin/settings" : "/admin/content"} prefetch={false}>← Back to management</Link><AdminHeader title={title} intro={key === "pricing:catalog" ? "Manage future service fees from the authoritative catalog. Existing order totals remain unchanged." : "Save a private draft, preview the saved version and publish only after review."} />{result.error ? <ManagementSetup /> : <ContentEditor key={key} recordKey={key} initial={result.data.record} initialHistory={result.data.history} seed={seed} enabled={siteManagementEnabled()} />}</>;
}
export default function Page(props: Props) { return <Suspense fallback={<p role="status">Loading private editor…</p>}><Editor {...props} /></Suspense>; }
