import { publicPages } from "@/content/pages";
import { publicMetadata } from "@/lib/seo";
import { ContentPage } from "./content-page";

function contentFor(slug: string) {
  const content = publicPages.find(page => page.slug === slug);
  if (!content) throw new Error("Public route is missing its reviewed content entry.");
  return content;
}
export function pageMetadata(slug: string) {
  const content = contentFor(slug);
  return publicMetadata(`/${slug}`, content.title, content.description, content.draft);
}
export function PublicRoute({ slug }: { slug: string }) {
  return <ContentPage content={contentFor(slug)} path={`/${slug}`} />;
}
