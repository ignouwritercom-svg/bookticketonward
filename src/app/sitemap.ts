import { publicEntries } from "@/content/registry";
import { sitemapFor } from "@/lib/seo";
export default function sitemap() { return sitemapFor(publicEntries); }
