import { publicPages } from "./pages";
import { destinations } from "./destinations";
import { guides } from "./guides";

export const publicEntries = [
  { path: "/", reviewed: "2026-11-03", draft: false },
  ...publicPages.map(page => ({ path: `/${page.slug}`, reviewed: page.reviewed, draft: !!page.draft })),
  ...destinations.map(page => ({ path: `/destinations/${page.slug}`, reviewed: page.reviewed, draft: false })),
  ...guides.map(page => ({ path: `/guides/${page.slug}`, reviewed: page.reviewed, draft: false })),
];
