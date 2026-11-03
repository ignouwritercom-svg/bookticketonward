# Public content and technical SEO

Phase 6, reviewed 3 November 2026. Local implementation only; no deployment or payment integration.

Phase 7 adds `/account/notifications` and `/admin/notifications`, plus their POST-only acknowledgment/retry APIs. They inherit private account/staff noindex policies, no-store proxy/response headers and fresh authorization; notification rows have owner RLS and logs/retries require staff RPC authorization. None is in the public route registry or sitemap. No robots rule is used as an access control. The draft privacy page now describes transactional account emails and activity read state without claiming production sending is enabled.

## Origin and launch controls

The owner approved **https://dummyticketonward.com** as the canonical origin. `src/lib/seo.ts` uses that origin by default; an optional server environment `SITE_URL` overrides it. An override must be an HTTPS origin without a path, query, credentials, port or fragment. Invalid configuration never produces a canonical URL and cannot enable indexing. The application does not derive canonical URLs from request headers.

`SITE_INDEXING_ENABLED=true` is an explicit launch switch. Its default is false, including the current development environment. Example settings are in `.env.example`; `.env.local` was not changed. Rebuild/restart after changing these build-time settings. Production and staging must have separate environment settings; `NODE_ENV=production` alone never enables indexing.

| Page type | Preview | Approved live configuration |
| --- | --- | --- |
| Home, service, pricing, process, sample, FAQ, destination and guide pages | noindex, nofollow | index, follow |
| Terms, privacy, refunds and contact drafts | noindex, nofollow | noindex, follow until individually approved |
| Login, booking, customer account, admin and document APIs | noindex, nofollow | noindex, nofollow |
| Unknown content slugs | 404 + noindex | 404 + noindex |

Draft status is explicit content data, not removed by the launch switch. Approval requires reviewing the actual text and updating that page's `draft` flag and review date. Business approval must not be inferred from the presence of a domain.

Preview robots disallows all crawling and the sitemap is empty. Live robots allows HTML crawling so search engines can observe private/draft `noindex`; `/api/` is disallowed. Private paths are absent from the sitemap. Robots rules do not establish privacy and can prevent crawlers from seeing noindex if a path is blocked. Existing fresh session verification, owner/staff authorization, RLS, private Storage and no-store/X-Robots-Tag headers are unchanged.

## Content structure

- `src/content/types.ts`: shared page, section, FAQ, destination, source and guide contracts. Content is plain structured text, not arbitrary CMS HTML.
- `src/content/pages.ts`: 11 public index/service/help/policy pages, draft flags and contextual links.
- `src/content/destinations.ts`: France and United Kingdom, including country/slug, substantial country-specific notes, official sources, reviewed dates, FAQs and related guide slugs.
- `src/content/guides.ts`: three guides with title, slug, excerpt, sections, publication/review dates, sources, related guides and services. Author/editor fields are optional and unused until genuine attribution is available.
- `src/content/registry.ts`: public route registry for the sitemap and tests. Private routes are never included.
- `src/components/public/content-page.tsx`: server-rendered article, breadcrumb, source list, native FAQ disclosure, related links and booking CTA.
- `src/components/public/fee-estimator.tsx`: bounded pricing-page client component using the existing integer-paise quote function. It collects no personal data, keeps selections in memory, and passes only service/trip type to booking. Server-rendered price comparison remains available without JavaScript; inactive selectors are hidden in that mode. Navigation and the mobile contents disclosure retain no-JavaScript access.

The local typed content repository is the first CMS layer. It requires reviewed code/content changes and a build; there is no unauthenticated editing API, admin CMS, rich-text ingestion or remote content dependency. A future CMS must validate this contract, restrict editors, keep revisions and preserve source/review/approval fields before publication.

Eleven explicit public route files share `PublicRoute` and the content registry. Destination and guide routes resolve their own registries. `generateStaticParams` prerenders known content. A narrowly matched public-collection proxy check returns a real HTTP 404 before streaming for unknown destination/guide slugs. This avoids the streamed HTTP-200 not-found shell under Cache Components; `dynamicParams=false` is unsupported in this Next version with that feature enabled. Page lookups also retain `notFound()` as defence in depth. Other unknown paths use the normal Next.js 404. Existing private proxy branches and authorization are unchanged. No wildcard country list or automatically generated thin content exists.

To add content: research official sources, create useful original guidance, record an honest review date, add links from a collection and related pages, then run the crawler and accessibility tests. Never invent requirements, authors, acceptance claims or embassy endorsements. Recheck before publishing and when the official source changes; review dates are not renewed on every build.

## Metadata, discovery and structured data

Each public page has a unique title, description, one H1, a self-referencing absolute canonical, Open Graph and Twitter metadata. Query variants canonicalise to the clean content path. Private pages do not inherit the home canonical because canonical metadata is defined at public page level, not in the root layout.

`/sitemap.xml` contains only eligible public pages when indexing is enabled, with actual content-review dates as `lastmod`. Drafts, auth, booking, account, admin, document APIs and social images are excluded. `/robots.txt` advertises the approved sitemap only in live mode.

`/social-image` generates a bounded 1200 × 630 PNG using Next ImageResponse, the current navy/teal design and factual service copy. Metadata includes descriptive image alt text and dimensions. The image is generated without remote image/font requests, has a cache header and is not a page in the sitemap. No ratings, reviews, partner badges or travel confirmations appear in it.

Visible breadcrumb navigation maps to `BreadcrumbList`. Guides use `Article` with matching visible title, description and dates; other content uses `WebPage`. There are no invented author objects, reviews, offers, business addresses or credentials. JSON-LD escapes `<` to prevent script termination if future content contains markup. FAQs remain useful native HTML; FAQ rich results are not promised and FAQPage markup is not emitted.

Existing homepage anchors remain functional. Its new contextual planning links and shared public footer connect every collection and service/help/policy page. Collection cards connect individual destinations/guides, and related links connect them back to services and each other. No navigation points to unimplemented `/admin/settings` or payment routes.

Next.js normalises trailing-slash variants with a permanent 308 redirect. No previous public slugs were removed, so there is no fabricated legacy redirect map. Future slug changes require a narrow old-to-new redirect, updated links and a fresh crawl. Unknown slugs remain true 404s. Production HTTPS and host/www redirection must be configured and tested with the eventual hosting provider; no hosting change was made here.

## Performance and accessibility

Public articles, prices, references, breadcrumbs and FAQs are server-rendered and prerendered for known slugs. Content introduces no CMS fetch, analytics library or client-side article renderer. Existing navigation/booking islands remain intact. New article/footer links disable eager prefetch to avoid downloading every linked page on long content pages.

System Arial/Helvetica fonts preserve the design and avoid remote font requests, swap shifts and font preload overhead. Samples are reusable HTML/CSS illustrations with permanent sample labels, not heavy raster downloads. Decorative Lucide icons are vector graphics; there are no new hero photographs to delay LCP. The social PNG is metadata-only and is not downloaded as an in-page hero. If real photographs are approved later, use Next Image with explicit dimensions, responsive sizes and descriptive alt text; preload only the genuine LCP image and lazy-load below-fold images.

Content columns use minmax(0, 1fr), cards stack on mobile, long source/link text wraps, and samples reserve their own document layout. Native FAQ details work without JavaScript. Existing reduced-motion styles, keyboard focus, mobile navigation Escape handling and skip links are preserved. The page-level heading hierarchy and source labels are tested.

`tests/public-performance.spec.ts` records local cold-cache mobile Chromium measurements at 390px, 4× CPU slowdown, 150ms latency and 1.6Mbps download. It measures LCP, CLS, transferred script bytes, font requests and sampled event duration. The latter is **not field INP**. Reports go to ignored `test-results/public-performance.json`; disposable Playwright traces are isolated in `test-results/browser` (which Playwright may clear), so retained evidence belongs outside that subdirectory; tests gate layout stability and font requests. Measured threshold misses must be reported, not hidden behind passing functional tests.

Targets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile of real visits. Local tests cannot establish real-user Core Web Vitals, rankings, crawlability of the deployed host or search appearance. After launch, verify Search Console, inspect live canonical/robots/sitemap output and use field measurements without logging booking data.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run build`.
- `npm run test:browser`: existing booking/customer/admin tests plus all-public metadata/link/schema/mobile/axe/no-JavaScript checks and lab performance. The runner uses empty Supabase configuration in child processes; it does not edit `.env.local` or contact development services.
- `npm run test:browser -- --seo-indexable tests/seo.spec.ts`: builds and serves an isolated index-enabled site locally to test actual live-mode metadata, robots and populated sitemap. This is not deployment and does not change the normal environment.
- **Always run a normal `npm run build` afterward** to restore the configured local artifact.

The crawler detects duplicate titles/descriptions/H1s, missing metadata, invalid/wrong canonicals, bad heading hierarchy, broken internal links/fragments and orphan public pages via graph traversal from home. It checks all registered content URLs, known private guards, structured-data correspondence, image dimensions, unknown-slug 404s and slash redirects. Automated WCAG checks are not a complete manual or assistive-technology audit. Official sources were read during research; external websites are not crawled by the local link test.

Verified in Phase 6: the initial full run passed 28/29 tests and exposed the streamed soft-404 issue described above. After correction, all 13 index-enabled SEO/customer/admin checks passed, including the failing scenario and the repeated complete public mobile/accessibility sweep. No unresolved test failure remains. The initial root-output cleanup removed old ignored integration artifacts; see PROGRESS.md for the incident and the new isolated output directory. Historical live Supabase results must not be confused with these local/mocked checks.

The subsequent UI/UX pass adds six browser scenarios, explicit native-select text-fit checks, complete mobile contents navigation, and a main-position assertion when opening the mobile menu. Homepage no-JavaScript expectations now cover both preview and explicitly enabled indexing. Current results and any lab target misses are recorded in PROGRESS.md and UI_UX_REVIEW.md; passing functional assertions alone does not establish that every performance target was met.

## Approval and release prerequisites

Final business identity/brand, verified support and privacy channels, hours/delivery targets, reservation-provider capability/validity, tax/invoice presentation, change/cancellation/refund terms, data retention/deletion and legal policy approval remain open. Draft contact/legal pages intentionally cannot be indexed via the launch switch alone. Country and guide copy should receive business/editorial sign-off without changing the source-backed limitations.

Payments remain on hold. Phase 5 is still architecture-only; no gateway credentials, payment confirmations, manual-paid controls, migrations, database changes or deployment were added. The existing paid-order publication/download restrictions remain active. The prior 40-check real Supabase document report is historical evidence, not a new Phase 6 live integration run.

## Primary references reviewed

- [GOV.UK visitor supporting documents](https://www.gov.uk/government/publications/visitor-visa-guide-to-supporting-documents/guide-to-supporting-documents-visiting-the-uk): UK visitor vs transit distinction.
- [France-Visas tourism and private stay](https://www.france-visas.gouv.fr/en/tourisme-et-sejour-prive): official category-specific starting point.
- [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): consistent canonical URLs and signals.
- [Google robots meta guidance](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag): noindex must be observable by crawling.
- [Web Vitals](https://web.dev/articles/vitals): metric targets and field/lab distinction.
- Installed Next.js 16.4.2 documentation: Metadata and OG images; generateStaticParams; sitemap/robots metadata conventions; ImageResponse. Local installed documentation was read before implementation.
