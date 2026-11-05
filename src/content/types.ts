export type ContentLink = { href: string; label: string };
export type ContentCard = { title: string; text: string; points?: string[]; link?: ContentLink };
export type ContentOverview = { label: string; title: string; points: string[]; action: ContentLink };
export type ContentSection = {
  heading: string;
  paragraphs: string[];
  items?: string[];
  links?: ContentLink[];
  cards?: ContentCard[];
  layout?: "steps" | "cards";
};
export type Question = { question: string; answer: string; link?: ContentLink };
export type PublicContent = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  overview?: ContentOverview;
  presentation?: "about" | "support" | "services" | "policy" | "questions" | "process";
  reviewed: string;
  sections: ContentSection[];
  related: ContentLink[];
  faqs?: Question[];
  draft?: boolean;
  feature?: "prices" | "samples" | "destinations" | "guides";
};
export type Source = { title: string; url: string };
export type Destination = PublicContent & { country: string; sources: Source[]; guideSlugs: string[] };
export type Guide = PublicContent & {
  excerpt: string;
  published: string;
  sources: Source[];
  relatedGuideSlugs: string[];
  // Only populate when a real contributor has agreed to attribution.
  author?: string;
  editor?: string;
};
