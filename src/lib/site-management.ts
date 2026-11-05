import { z } from "zod";

const text = (max = 4000) => z.string().trim().max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), "Remove control characters.");
const required = (max = 4000) => text(max).min(1, "This field is required.");
export const localLink = required(250).refine(value => /^\/(?!\/)[a-z0-9/?#=&%._-]*$/i.test(value), "Use a link within this website, starting with /.");
const link = z.object({ label: required(120), href: localLink }).strict();
const date = required(10).refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, "Use a valid date.");
const source = z.object({ title: required(180), url: required(500).refine(value => { try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; } }, "Use an HTTPS source without embedded credentials.") }).strict();
const card = z.object({ title: required(180), text: required(), points: z.array(required(500)).max(15).optional(), link: link.optional() }).strict();
const section = z.object({ heading: required(180), paragraphs: z.array(required()).max(20), items: z.array(required(1000)).max(30).optional(), links: z.array(link).max(15).optional(), cards: z.array(card).max(12).optional(), layout: z.enum(["steps", "cards"]).optional() }).strict();
const faq = z.object({ question: required(250), answer: required(), link: link.optional() }).strict();
const slug = required(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.");
const shape = {
  slug, title: required(160), description: required(320), intro: required(), reviewed: date,
  sections: z.array(section).min(1, "Add at least one useful section.").max(30),
  related: z.array(link).max(15), faqs: z.array(faq).max(30).optional(), draft: z.boolean().optional(),
  overview: z.object({ label: required(160), title: required(250), points: z.array(required(1000)).max(12), action: link }).strict().optional(),
  presentation: z.enum(["about", "support", "services", "policy", "questions", "process"]).optional(),
  feature: z.enum(["prices", "samples", "destinations", "guides"]).optional(),
};
export const pageContentSchema = z.object(shape).strict();
export const guideContentSchema = z.object({ ...shape, excerpt: required(500), published: date, sources: z.array(source).max(20), relatedGuideSlugs: z.array(slug).max(15), author: text(120).optional(), editor: text(120).optional() }).strict();
export const destinationContentSchema = z.object({ ...shape, country: required(100), sources: z.array(source).min(1, "Add an official government or immigration source.").max(20), guideSlugs: z.array(slug).max(15) }).strict();
const money = z.number().int().min(1).max(10_000_000);
export const pricingSchema = z.object({ standardFlightMinor: money, multiCityMinor: money, hotelMinor: money, comboDiscountMinor: z.number().int().min(0).max(10_000_000) }).strict().refine(value => value.comboDiscountMinor < Math.min(value.standardFlightMinor, value.multiCityMinor) + value.hotelMinor, { path: ["comboDiscountMinor"], message: "The combo fee must remain positive." });
export const policiesSchema = z.object({ flightText: required(8000), reservationText: required(8000) }).strict();
export const preferencesSchema = z.object({
  supportEmail: text(254).refine(value => !value || z.email().safeParse(value).success, "Enter a valid support email."),
  whatsapp: text(20).refine(value => !value || /^\+[1-9]\d{6,14}$/.test(value), "Include + and the country code, without spaces."),
  days: required(80), opens: required(5).regex(/^([01]\d|2[0-3]):[0-5]\d$/), closes: required(5).regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  minMinutes: z.number().int().min(5).max(1440), maxMinutes: z.number().int().min(5).max(1440),
  heroTitle: required(120), heroHighlight: required(120), heroIntro: required(1000),
  homeMetaTitle: required(160), homeMetaDescription: required(320),
}).strict().refine(value => value.opens < value.closes, { path: ["closes"], message: "Closing time must follow opening time (IST)." }).refine(value => value.maxMinutes >= value.minMinutes, { path: ["maxMinutes"], message: "Maximum target must follow minimum target." });

export type Pricing = z.infer<typeof pricingSchema>;
export type SitePreferences = z.infer<typeof preferencesSchema>;
export type SitePayload = z.infer<typeof pageContentSchema> | z.infer<typeof guideContentSchema> | z.infer<typeof destinationContentSchema> | Pricing | z.infer<typeof policiesSchema> | SitePreferences;
export const managementKey = z.string().regex(/^(?:page|guide|destination):[a-z0-9]+(?:-[a-z0-9]+)*$|^(?:settings:site|pricing:catalog|policies:booking)$/).max(100);
export function payloadSchema(key: string): z.ZodType<SitePayload> {
  return key === "settings:site" ? preferencesSchema : key === "pricing:catalog" ? pricingSchema : key === "policies:booking" ? policiesSchema : key.startsWith("guide:") ? guideContentSchema : key.startsWith("destination:") ? destinationContentSchema : pageContentSchema;
}
export const siteMutation = z.object({ key: managementKey, action: z.enum(["save", "publish", "withdraw", "restore"]), revision: z.number().int().min(0), payload: z.unknown().optional(), sourceRevision: z.number().int().positive().optional(), confirmed: z.boolean().optional() }).strict();
export type ManagedRecord = { key: string; revision: number; draft: SitePayload; published: SitePayload | null; active: boolean; published_revision: number | null; updated_at: string; published_at: string | null };
export type ManagedRevision = { revision: number; action: string; created_at: string; actor_id: string; source_revision: number | null; payload: SitePayload };
export type PublicSiteSnapshot = { preferences: SitePreferences; pricing: Pricing; policies: { flight: { version: string; text: string }; reservation: { version: string; text: string } }; records: { key: string; active: boolean; payload: SitePayload | null }[] };
export type PublicRuntime = Omit<PublicSiteSnapshot, "records">;

export function priceInput(minor: number) { return `${Math.floor(minor / 100)}${minor % 100 ? `.${String(minor % 100).padStart(2, "0")}` : ""}`; }
export function parsePriceInput(value: string) { if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(value)) return null; const [major, decimal = ""] = value.split("."); return Number(major) * 100 + Number(decimal.padEnd(2, "0")); }
export { preferenceHours, preferenceDelivery, pricingCatalog, materializeContent } from "./site-runtime";
