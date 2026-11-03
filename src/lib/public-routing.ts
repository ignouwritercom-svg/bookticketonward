import { destinations } from "@/content/destinations";
import { guides } from "@/content/guides";

// Only these two public collections need a pre-stream existence check.
// This never classifies login, booking, account, admin or API requests as public.
export function publicCollectionStatus(path: string): "known" | "missing" | null {
  if (!/^\/(destinations|guides)(?:\/|$)/.test(path)) return null;
  const paths = ["/destinations", "/guides", ...destinations.map(item => `/destinations/${item.slug}`), ...guides.map(item => `/guides/${item.slug}`)];
  return paths.includes(path) ? "known" : "missing";
}

