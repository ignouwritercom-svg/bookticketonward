import { revalidatePath, revalidateTag } from "next/cache";
import { staffSession } from "@/lib/admin";
import { failure, json, readBody } from "@/lib/api";
import { managementKey, materializeContent, payloadSchema, siteMutation, type SitePayload } from "@/lib/site-management";
import { siteSeeds } from "@/lib/site-defaults";
import { publishedEntries, readPublicSite, siteManagementEnabled } from "@/lib/site-content";
import { headingId } from "@/lib/seo";
import { editorialToday } from "@/lib/site-runtime";
function contentLinks(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(contentLinks);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) => key === "href" && typeof item === "string" ? [item] : ["guideSlugs", "relatedGuideSlugs"].includes(key) && Array.isArray(item) ? item.map(slug => `/guides/${slug}`) : contentLinks(item));
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await readBody(request, 131072); } catch { return failure("Invalid management request.", 403); }
  try {
    const { client, allowed } = await staffSession();
    if (!client || !allowed) return failure("Active staff access required.", 403);
    const parsed = siteMutation.safeParse(body);
    if (!parsed.success) return failure("Check the action and saved revision.");
    const input = parsed.data;
    let savedPayload: SitePayload | undefined;
    if (input.key.startsWith("page:") && !siteSeeds[input.key]) return failure("Choose an existing website page.");
    if (input.action === "save") {
      const payload = payloadSchema(input.key).safeParse(input.payload);
      if (!payload.success) return json({ error: "Review the highlighted content fields.", issues: payload.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })) }, 400);
      savedPayload = payload.data;
      if ("slug" in payload.data && payload.data.slug !== input.key.split(":")[1]) return failure("The saved URL cannot be changed. Create a new article for a new URL.");
      if (input.key.startsWith("page:")) {
        const original = siteSeeds[input.key];
        if ("sections" in original && "sections" in payload.data && (original.presentation !== payload.data.presentation || original.feature !== payload.data.feature)) return failure("Keep the existing page layout and service components.");
      }
    }
    if (["publish", "withdraw"].includes(input.action)) {
      if (!siteManagementEnabled()) return failure("Enable SITE_MANAGEMENT_ENABLED after applying the management migration before publishing.", 409);
      if (!input.confirmed) return failure("Review and confirm this publication change.");
      if (input.action === "withdraw") {
        const entries = publishedEntries(await readPublicSite());
        const path = input.key.startsWith("guide:") ? `/guides/${input.key.slice(6)}` : `/destinations/${input.key.slice(12)}`;
        const target = (input.key.startsWith("guide:") ? entries.guides : entries.destinations).find(page => page.slug === input.key.split(":")[1]);
        const incoming = [...entries.pages, ...entries.guides, ...entries.destinations].filter(page => page !== target && contentLinks(page).some(link => link.split(/[?#]/)[0] === path));
        if (incoming.length) return failure(`Update incoming links before withdrawing this article: ${incoming.map(page => page.title).slice(0, 4).join(", ")}.`, 409);
      }
      if (input.action === "publish") {
        const current = await client.rpc("admin_site_record", { p_key: input.key });
        if (current.error || current.data?.record?.revision !== input.revision) return failure("This draft changed. Reload it before publishing.", 409);
        const payload = payloadSchema(input.key).parse(current.data.record.draft);
        const today = editorialToday();
        if ("reviewed" in payload && payload.reviewed > today || "published" in payload && typeof payload.published === "string" && payload.published > today) return failure("Publication and review dates cannot be in the future.");
        // Validate local references against the current published collection plus this page.
        if ("slug" in payload) {
          const snapshot = await readPublicSite(), entries = publishedEntries(snapshot);
          const rendered = materializeContent(payload, snapshot);
          const headings = rendered.sections.map(section => headingId(section.heading));
          if (headings.some(id => !id) || new Set(headings).size !== headings.length) return failure("Use distinct section headings that produce readable URL anchors.");
          if (new Set(rendered.faqs?.map(faq => faq.question.trim().toLowerCase())).size !== (rendered.faqs?.length ?? 0)) return failure("Remove duplicate FAQ questions.");
          const target = (input.key.startsWith("guide:") ? entries.guides : input.key.startsWith("destination:") ? entries.destinations : entries.pages).find(page => page.slug === rendered.slug);
          if ([...entries.pages, ...entries.guides, ...entries.destinations].some(page => page !== target && page.title.trim().toLowerCase() === rendered.title.trim().toLowerCase())) return failure("Another published page already uses this title. Choose a unique title.");
          const known = new Set(["/", "/book", "/login", "/account", "/account/orders", "/account/drafts", "/account/documents", "/account/help", "/account/settings", "/account/notifications", ...entries.pages.map(page => `/${page.slug}`), ...entries.guides.map(page => `/guides/${page.slug}`), ...entries.destinations.map(page => `/destinations/${page.slug}`), input.key.startsWith("guide:") ? `/guides/${payload.slug}` : input.key.startsWith("destination:") ? `/destinations/${payload.slug}` : `/${payload.slug}`]);
          const links: string[] = [];
          const walk = (value: unknown): void => { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) { if (key === "href" && typeof item === "string") links.push(item); else walk(item); } };
          walk(payload);
          if (links.some(link => !known.has(link.split(/[?#]/)[0]))) return failure("A link points to an unpublished or unknown page. Publish the target first or change the link.");
          const guideSlugs: string[] = "relatedGuideSlugs" in payload ? payload.relatedGuideSlugs as string[] : "guideSlugs" in payload ? payload.guideSlugs as string[] : [];
          if (guideSlugs.some(slug => !known.has(`/guides/${slug}`))) return failure("Choose published related guides.");
        }
      }
    }
    if (input.action === "restore" && !input.sourceRevision) return failure("Choose a saved revision.");
    const result = await client.rpc("admin_site_mutate", { p_key: managementKey.parse(input.key), p_revision: input.revision, p_action: input.action, p_payload: input.action === "save" ? savedPayload : null, p_source_revision: input.sourceRevision ?? null, p_confirmed: input.confirmed === true });
    if (result.error) return failure(result.error.code === "40001" ? "This record changed in another tab. Reload before saving; your edits are still here." : "Management action unavailable. Check the migration, revision and staff access.", 409);
    const fresh = await client.rpc("is_booking_staff");
    if (fresh.error || fresh.data !== true) return failure("Staff access has ended.", 403);
    if (["publish", "withdraw"].includes(input.action)) { revalidateTag("managed-website", { expire: 0 }); revalidatePath("/", "layout"); }
    return json(result.data);
  } catch { return failure("Management services could not be reached. Reload the saved version before retrying.", 503); }
}
