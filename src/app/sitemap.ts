import { publicSite, publishedEntries } from "@/lib/site-content";
import { sitemapFor } from "@/lib/seo";
export default async function sitemap() {
  const snapshot = await publicSite(), entries = publishedEntries(snapshot);
  return sitemapFor([{ path: "/", reviewed: "2026-11-05", draft: false }, ...entries.pages.map(page => ({ path: `/${page.slug}`, reviewed: page.reviewed, draft: !!page.draft })), ...entries.guides.map(page => ({ path: `/guides/${page.slug}`, reviewed: page.reviewed, draft: !!page.draft })), ...entries.destinations.map(page => ({ path: `/destinations/${page.slug}`, reviewed: page.reviewed, draft: !!page.draft }))]);
}
