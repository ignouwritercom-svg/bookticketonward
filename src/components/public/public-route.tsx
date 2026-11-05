import { publicSite, publishedEntries } from "@/lib/site-content";
import { publicMetadata } from "@/lib/seo";
import { ContentPage } from "./content-page";
import { BrandPage } from "./brand-page";

async function contentFor(slug: string) {
  const snapshot = await publicSite();
  const content = publishedEntries(snapshot).pages.find(page => page.slug === slug);
  if (!content) throw new Error("Public route is missing its reviewed content entry.");
  return { content, snapshot };
}
export async function pageMetadata(slug: string) {
  const { content } = await contentFor(slug);
  return publicMetadata(`/${slug}`, content.title, content.description, content.draft);
}
export async function PublicRoute({ slug }: { slug: string }) {
  const { content, snapshot } = await contentFor(slug);
  return content.presentation ? <BrandPage content={content} runtime={snapshot} /> : <ContentPage content={content} path={`/${slug}`} runtime={snapshot} collections={publishedEntries(snapshot)} />;
}
