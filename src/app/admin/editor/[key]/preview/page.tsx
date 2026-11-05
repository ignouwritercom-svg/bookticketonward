import { Suspense } from "react";
import Link from "next/link";
import { staffPage } from "@/lib/admin";
import { confirmStaff, editorKey, editorPath } from "@/lib/admin-workspace";
import { managementKey, materializeContent, payloadSchema } from "@/lib/site-management";
import { publicSite } from "@/lib/site-content";
import type { Source } from "@/content/types";
import { AdminDenied } from "@/components/admin/access";
import { AdminHeader } from "@/components/admin/workspace";
import { ArticleSection } from "@/components/public/content-page";
type Props = { params: Promise<{ key: string }> };
async function Preview({ params }: Props) {
  const key = editorKey((await params).key);
  const { client, allowed, error } = await staffPage(`/admin/editor/${key.replace(":", "--")}/preview`);
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  if (!managementKey.safeParse(key).success || !/^(page|guide|destination):/.test(key)) return <h1>Preview Unavailable</h1>;
  const result = await client.rpc("admin_site_record", { p_key: key });
  if (!await confirmStaff(client)) return <AdminDenied />;
  const parsed = payloadSchema(key).safeParse(result.data?.record?.draft);
  if (!parsed.success || !("sections" in parsed.data)) return <><h1>Saved Draft Unavailable</h1><Link href={editorPath(key)}>Return to the editor</Link></>;
  const content = materializeContent(parsed.data, await publicSite());
  return <><AdminHeader title="Draft Content Preview" intro="Private review of the saved text, links and references. The public page keeps its existing visual template." /><p className="ops-preview-banner">Saved revision {result.data.record.revision} · This preview does not publish content. Check all linked references and page metadata before approval.</p><Link className="text-link" href={editorPath(key)} prefetch={false}>Return to editor →</Link><article className="ops-editor"><h2>{content.title}</h2><p>{content.intro}</p><p className="ops-notice">Search description: {content.description} · Reviewed: {content.reviewed} · {content.draft ? "Provisional / noindex" : "Eligible for the site’s global indexing policy"}</p>{content.sections.map((section, index) => <ArticleSection key={index} section={section} />)}{content.faqs?.map((faq, index) => <section key={index}><h3>{faq.question}</h3><p>{faq.answer}</p></section>)}{"sources" in content && <section><h3>Sources and references</h3><ul>{(content.sources as Source[]).map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul></section>}</article></>;
}
export default function Page(props: Props) { return <Suspense fallback={<p role="status">Loading private content preview…</p>}><Preview {...props} /></Suspense>; }
