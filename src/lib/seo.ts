import type { Metadata, MetadataRoute } from "next";

// Public origin approved by the owner on 3 November 2026. Never derive from Host.
export const approvedOrigin = "https://dummyticketonward.com";
type SeoEnvironment = { SITE_URL?: string; SITE_INDEXING_ENABLED?: string };
export function siteConfig(env: SeoEnvironment = { SITE_URL: process.env.SITE_URL, SITE_INDEXING_ENABLED: process.env.SITE_INDEXING_ENABLED }) {
  const raw = env.SITE_URL ?? approvedOrigin;
  let origin: string | undefined;
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" && !url.username && !url.password && !url.port &&
      url.pathname === "/" && !url.search && !url.hash && url.hostname.includes(".") &&
      !/localhost|^\d+\.\d+\.\d+\.\d+$|your-domain|placeholder/i.test(url.hostname)) origin = url.origin;
  } catch { /* Invalid origins never become canonical URLs. */ }
  const index = env.SITE_INDEXING_ENABLED === "true";
  if (index && !origin) throw new Error("Indexing requires a valid HTTPS SITE_URL origin.");
  return { origin, index: index && !!origin };
}

export function publicMetadata(path: string, title: string, description: string, draft = false): Metadata {
  const { origin, index } = siteConfig();
  const url = origin ? new URL(path, origin).href : undefined;
  const fullTitle = `${title} | DummyTicket`;
  const images = origin ? [{ url: `${origin}/social-image`, width: 1200, height: 630, alt: "DummyTicket — temporary flight and hotel reservation documents" }] : [];
  return {
    title: fullTitle, description,
    alternates: url ? { canonical: url } : undefined,
    robots: { index: index && !draft, follow: index },
    openGraph: { type: "website", title: fullTitle, description, url, siteName: "DummyTicket", locale: "en_IN", images },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: images.map(image => image.url) },
  };
}

export function robotsFor(config = siteConfig()): MetadataRoute.Robots {
  if (!config.index) return { rules: { userAgent: "*", disallow: "/" } };
  // Private HTML is crawlable so crawlers can observe noindex; APIs are not.
  // Authentication, ownership checks and no-store independently protect data.
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${config.origin}/sitemap.xml` };
}

export type SitemapEntry = { path: string; reviewed: string; draft?: boolean };
export function sitemapFor(entries: SitemapEntry[], config = siteConfig()): MetadataRoute.Sitemap {
  if (!config.index || !config.origin) return [];
  return entries.filter(entry => !entry.draft).map(entry => ({
    url: new URL(entry.path, config.origin).href,
    lastModified: entry.reviewed,
  }));
}

export function headingId(heading: string) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
