import { notFound } from "next/navigation";
import { guides } from "@/content/guides";
import { ContentPage } from "@/components/public/content-page";
import { publicMetadata } from "@/lib/seo";
type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return guides.map(page => ({ slug: page.slug })); }
async function getPage(params: Props["params"]) { const { slug } = await params; const page = guides.find(item => item.slug === slug); if (!page) notFound(); return page; }
export async function generateMetadata({ params }: Props) {
  const page = await getPage(params); const metadata = publicMetadata(`/guides/${page.slug}`, page.title, page.description);
  return { ...metadata, openGraph: { ...metadata.openGraph, type: "article" as const, publishedTime: page.published, modifiedTime: page.reviewed } };
}
export default async function Page({ params }: Props) { const page = await getPage(params); return <ContentPage content={page} path={`/guides/${page.slug}`} parent={{ href: "/guides", label: "Guides" }} sources={page.sources} relatedGuides={page.relatedGuideSlugs} article={page} />; }
