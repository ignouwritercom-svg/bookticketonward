import { notFound } from "next/navigation";
import { destinations } from "@/content/destinations";
import { ContentPage } from "@/components/public/content-page";
import { publicMetadata } from "@/lib/seo";
type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return destinations.map(page => ({ slug: page.slug })); }
async function getPage(params: Props["params"]) { const { slug } = await params; const page = destinations.find(item => item.slug === slug); if (!page) notFound(); return page; }
export async function generateMetadata({ params }: Props) { const page = await getPage(params); return publicMetadata(`/destinations/${page.slug}`, page.title, page.description); }
export default async function Page({ params }: Props) { const page = await getPage(params); return <ContentPage content={page} path={`/destinations/${page.slug}`} parent={{ href: "/destinations", label: "Destinations" }} sources={page.sources} relatedGuides={page.guideSlugs} />; }
