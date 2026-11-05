import { notFound } from "next/navigation";
import { guides } from "@/content/guides";
import { publicSite, publishedEntries } from "@/lib/site-content";
import { ContentPage } from "@/components/public/content-page";
import { publicMetadata } from "@/lib/seo";
type Props = { params: Promise<{ slug: string }> };
// CMS slugs can be published after deployment. Render their first request as
// full server HTML so new articles also work without JavaScript.
export const instant = false;
export function generateStaticParams() { return guides.map(page => ({ slug: page.slug })); }
async function getPage(params: Props["params"]) { const { slug } = await params; const snapshot = await publicSite(), collections = publishedEntries(snapshot); const page = collections.guides.find(item => item.slug === slug); if (!page) notFound(); return { page, snapshot, collections }; }
export async function generateMetadata({ params }: Props) {
 const { page } = await getPage(params);
 const metadata = publicMetadata(`/guides/${page.slug}`, page.title, page.description, page.draft);
 return { ...metadata, openGraph: { ...metadata.openGraph, type: "article" as const, publishedTime: page.published, modifiedTime: page.reviewed } };
}
export default async function Page({ params }: Props) { const { page, snapshot, collections } = await getPage(params); return <ContentPage content={page} path={`/guides/${page.slug}`} parent={{ href: "/guides", label: "Guides" }} sources={page.sources} relatedGuides={page.relatedGuideSlugs} article={page} runtime={snapshot} collections={collections} />; }
