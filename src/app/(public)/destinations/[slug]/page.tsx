import { notFound } from "next/navigation";
import { destinations } from "@/content/destinations";
import { publicSite, publishedEntries } from "@/lib/site-content";
import { ContentPage } from "@/components/public/content-page";
import { publicMetadata } from "@/lib/seo";
type Props = { params: Promise<{ slug: string }> };
// Newly published CMS slugs must render full HTML without a rebuild or JS.
export const instant = false;
export function generateStaticParams() { return destinations.map(page => ({ slug: page.slug })); }
async function getPage(params: Props["params"]) { const { slug } = await params; const snapshot = await publicSite(), collections = publishedEntries(snapshot); const page = collections.destinations.find(item => item.slug === slug); if (!page) notFound(); return { page, snapshot, collections }; }
export async function generateMetadata({ params }: Props) {
 const { page } = await getPage(params);
 const metadata = publicMetadata(`/destinations/${page.slug}`, page.title, page.description, page.draft);
 return metadata;
}
export default async function Page({ params }: Props) { const { page, snapshot, collections } = await getPage(params); return <ContentPage content={page} path={`/destinations/${page.slug}`} parent={{ href: "/destinations", label: "Destinations" }} sources={page.sources} relatedGuides={page.guideSlugs}  runtime={snapshot} collections={collections} />; }
