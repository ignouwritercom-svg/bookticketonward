# Routes and links

## Separate customer and admin entry — 5 November 2026

Customer sign-in remains `/login`; staff use the direct `/admin-login` URL. No public header, footer, marketing page or sitemap advertises the staff entry. The staff screen sits outside the admin workspace layout, so an anonymous visitor sees no workspace navigation. Unauthenticated configured staff routes redirect to this entry with an allowlisted admin return destination; customer login accepts only customer/booking return destinations. Admin sign-out returns to `/admin-login`.

`/api/staff-auth/session`, `/send` and `/verify` use the existing verified Supabase identity and OTP configuration. Staff OTP requests disable account creation, verification independently checks `is_booking_staff`, and denied verification signs the local session out. Existing staff page/API/RPC checks remain independent of the entry URL. The new page/API have private no-store/noindex headers; the existing index-enabled robots policy lets crawlers observe HTML noindex and blocks API crawling. No new credential, role, migration or payment capability is introduced.

## Admin information architecture — 5 November 2026

Existing staff routes now share grouped navigation, route-safe breadcrumbs, related-module links and a section-search dialog. The canonical route model is `src/lib/admin-navigation.ts`; it contains only static admin destinations and does not expose record identifiers in breadcrumb labels. Editorial collection query state is reflected in active links through small isolated Suspense boundaries. Mobile navigation is a modal drawer; native fallback links remain for no-JavaScript use. No route, redirect, authentication, API or database change is required by this refinement.

## Expanded admin workspace — 5 November 2026

Added protected `/admin/documents`, `/admin/customers`, `/admin/customers/[UUID]`, `/admin/content`, `/admin/content/new`, `/admin/editor/[key]`, `/admin/editor/[key]/preview`, `/admin/settings` and `/admin/activity`. Overview/orders/notifications/detail pages retain their routes and gain the common staff navigation and operational controls. New bounded same-origin POST endpoints: `/api/admin/site` and `/api/admin/customers`. Every page/API independently checks staff access; all remain no-store/noindex and outside the sitemap. New exact/validated login return paths are allowlisted.

With management enabled, existing public routes and new reviewed guide/destination slugs read only published records. Their visible copy, metadata, related collections and sitemap share that source. Public pre-stream checks return 404 for missing/withdrawn articles, never reveal never-published drafts, and use 503 for provider failure. Domain and core route layouts remain fixed. Fifth migration/manual setup and scope: [ADMIN_WORKSPACE.md](ADMIN_WORKSPACE.md).

## Customer workspace routes — 5 November 2026

Added `/account` (overview), `/account/drafts`, `/account/documents`, `/account/settings` and `/account/help`. Reworked `/account/orders` into a searchable/paginated history and preserved the existing opaque-ID order-detail and activity routes. All are private, no-store/noindex and independently call the fresh customer-auth page guard. Shared account navigation makes each route reachable; safe login-return paths explicitly allow the five new exact paths and reject query-string/identity injection. Existing login defaults and booking return behaviour remain.

New `POST /api/account/workspace` serves only authenticated, owner-scoped, paginated summaries. Reference/service/status/sort filters stay in the request body, not URL parameters. Document links retain `/api/documents/[UUID]`; draft resume retains `/book?draft=[UUID]`. No public canonical, sitemap entry, gateway, account-write API or migration is added. See [CUSTOMER_WORKSPACE.md](CUSTOMER_WORKSPACE.md).

## Compact data attribution — 5 November 2026

Homepage and `/book` no longer display the location-provider credit below their forms. The shared footer across all routes includes a collapsed native “Data credits” disclosure, preserving accessible public source/licence/adaptation information without adding a page, URL, sitemap entry or client interaction code. Booking/service guidance and lookup APIs are unchanged.

## Location suggestions — 5 November 2026

`/` and `/book` use the shared accessible location combobox for flight From/To. `/book?service=hotel` and `service=combo` use city/country suggestions for every hotel stay. Homepage URL fields and all existing booking schemas remain unchanged; search text is never placed in a new query string. Manual entry and optional hotel/area preferences remain available.

New `POST /api/locations` is a public reference lookup accepting strict bounded `kind/query/country`, same-origin JSON only. It returns at most eight public names, private/no-store/noindex, with no account/booking reads or writes. No page, indexable URL or sitemap entry is added. Server-only snapshot tracing and research: [LOCATION_SEARCH.md](LOCATION_SEARCH.md).

## Dedicated brand and help layouts — 5 November 2026

- New `/about`: purpose, approach, three actual reservation services, account workflow and information handling. Title **About DummyTicket**; standard approved-origin canonical, AboutPage JSON-LD, normal public launch-index gate. Linked in the common footer and to service/pricing/help pages.
- Existing `/dummy-ticket`: product/fee/selection layout; remains the sole canonical service URL.
- Existing `/contact`: **Contact and Booking Help**, with real task navigation and account access. Retains draft/noindex; approved direct contacts are still unavailable.
- `/terms`, `/privacy`, `/refunds`: concise Title Case titles, cross-policy navigation, summaries and numbered reading chapters. Preserve provisional notices, draft/noindex, existing policy copy and service CTA.
- `/faq`, `/how-it-works`: answer-bank and process layouts with distinct roadmap panels, native disclosures, exact section anchors and existing actions.

These eight URLs use `PublicContent.presentation` and `BrandPage`; articles, destination pages, pricing and samples retain their working components. There are now 18 registered public URLs. Metadata/schema and the sitemap use the same exports. No private or API route is added; shared header/footer and all authorization remain unchanged. Research: [PUBLIC_PAGE_REDESIGN.md](PUBLIC_PAGE_REDESIGN.md).

## Public content expansion — 5 November 2026

All 17 existing public URLs retain their routes and Title Case H1s. The 16 editorial URLs use typed overview/decision-card content from `src/content/depth.ts`, composed into their exported registries before rendering. Section navigation, related links, metadata review dates and sitemap dates use those same exports. No new thin country pages or duplicate route aliases were added.

| Pages | New practical content |
| --- | --- |
| `/` | Expanded service-choice cards, document-service explanation, three guide previews and destination reading paths |
| `/dummy-ticket` | Flight/hotel/combo decision cards and preparation checklist, before the existing service explanations |
| `/pricing` | Included/excluded service explanation and two-traveller one/two-stay examples derived from shared pricing |
| `/how-it-works` | Draft/order/preparation/document stages and a review-screen checklist |
| `/sample-dummy-ticket` | Separate flight and hotel document-inspection checklists |
| `/faq` | Reading paths for comparing, checking requirements and returning customers |
| `/contact` | Sign-in, missing-record, document-download and correction troubleshooting; private-information guidance |
| `/terms`, `/privacy`, `/refunds` | More detailed workflow and information-handling explanations; still provisional/noindex, with no new legal promises |
| `/destinations`, `/destinations/france`, `/destinations/united-kingdom` | Research steps and country-specific planning/decision checklists; official sources retained |
| `/guides` and the three existing guide URLs | Reading paths, document distinctions, a private research worksheet, overnight-arrival walkthrough and final review checklists |

Public overviews use contextual actions rather than treating every visitor as ready to book. No customer details enter public links; service links use only existing service/trip choices. No changes to booking, account, staff, notification or document API routes.

Typography review (4 November 2026): H1 page headings use Title Case across home, public, booking, login, account and staff views, including loading/error headings. Public content titles keep metadata, breadcrumbs and structured data consistent with their H1s; order-reference H1s retain their exact identifiers. Buttons and other generic UI keep sentence case, including the “Book dummy ticket” CTA. Product-choice names retain their established spelling. Public title components no longer append punctuation. Routes, internal links, eligibility and indexing rules are unchanged. The trip starter and progress indicator adapt layout on narrow screens rather than shrinking labels. Home feature styles are isolated from account-status badges across client navigation.

## Public presentation review — 4 November 2026

Home/public/booking/customer pages now use customer-oriented text without development phase notices or setup/migration instructions. The homepage FAQ's Booking help link opens `/contact` directly, including without JavaScript; the retired development modal was removed. Footer policy labels are concise, while `/terms`, `/privacy` and `/refunds` retain a visible provisional-policy notice and noindex. `/contact` stays noindex with self-service order, sign-in and FAQ links; direct support is honestly unavailable until approved contacts are supplied.

`/admin` adds an owner readiness checklist **inside the existing freshly authorized staff content**, after the repeated staff-role check. It is not available in the shared footer or public route content. Customer-facing availability failures remain closed and use retry guidance. No routes, payment capabilities, accepted snapshots or authorization boundaries changed. See [LAUNCH_READINESS.md](LAUNCH_READINESS.md).

## Phase-seven notification routes

| Route | Behaviour |
| --- | --- |
| `/account/notifications` | Verified owner-only paginated activity, explicit read state, current order links |
| `/api/notifications` POST | Same-origin verified owner read acknowledgment; no enqueue or recipient input |
| `/admin/notifications` | Fresh staff authorization, paginated/failed-only log, attempts and sanitized outcomes |
| `/api/admin/notifications` POST | Staff-only idempotent retry of failed jobs with attempt cap and ambiguous-delivery acknowledgment |

Account order pages also show activity; admin overview highlights failed notifications and paid orders awaiting action. All new pages/APIs remain no-store/noindex and excluded from the sitemap. Authentication/RLS protects data independently of indexing policy. SMTP is a separate worker command, never a public mail endpoint. Setup: [NOTIFICATIONS_SETUP.md](NOTIFICATIONS_SETUP.md).

Phase 5 payment endpoints are proposed only in [PHASE5_PAYMENTS_ARCHITECTURE.md](PHASE5_PAYMENTS_ARCHITECTURE.md). No checkout, gateway callback, payment webhook or refund route is implemented by that architecture work.

Hotel extension: `/book?service=flight|hotel|combo` selects the service; only that enum is added to URL prefill. Hotel city/country/stay/guest details are never copied into URLs. Existing `/book?draft=<uuid>` resumes every service. The homepage has three service cards and hotel/combo price links; `/admin/orders` adds a validated service filter. Existing account/order routes display hotel snapshots and typed document versions. See HOTEL_SETUP.md for migrations.

## Phase-four implemented routes

| Route | Behavior |
| --- | --- |
| `/admin` | Fresh verified staff authorization; actual database counts; existing OTP login redirect |
| `/admin/orders` | Staff-only 20-item pages, reference prefix search, payment/fulfilment/IST date filters |
| `/admin/orders/[orderId]` | Staff order snapshot, contact compose links, private notes, PDF versions, publication/withdrawal/manual delivery and audit |
| `/api/admin/orders/[orderId]` POST | Same-origin staff-only narrow actions; database rechecks role and paid-order constraints |
| `/api/admin/orders/[orderId]/upload` POST | Same-origin staff authorization, bounded/validated raw PDF upload, private version reservation/finalization |
| `/api/documents/[documentId]` GET | Verified paid-order owner for published versions, or active staff preview; authorization before and after private byte fetch |
| `/account/orders/[orderId]` | Existing owner-scoped snapshot plus published/non-withdrawn documents, version/date and honest unavailable state |

All private routes use no-store headers; admin routes have noindex metadata. Every page/API checks staff or owner authorization; navigation visibility is not a security boundary. The login return-path allowlist now includes exact admin paths/UUIDs but not arbitrary queries. No role-assignment or payment-confirmation route exists. `/admin/settings` remains unimplemented.

The public route table and booking context below are current. The Phase-four table above defines implemented admin/document routes.

`/`, `/book`, `/login`, `/account/orders` and `/account/orders/[orderId]` are implemented. Login/account links open real routes. The shared public footer opens actual help and provisional-policy pages. Homepage help opens `/contact` directly. `/robots.txt` blocks preview indexing; account metadata and headers are noindex. Authentication and RLS, not robots rules, protect private data.

## Homepage sections

The root header is shared across all website/workspace routes: `/dummy-ticket`, `/pricing`, `/destinations`, `/guides`. The common footer supplies process, samples, FAQ, contact, policy and account links. Home retains its in-page anchors and sections; header navigation now follows the same destinations as other pages.

Hero, header, closing action and footer booking links → `/book`. Pricing links → `/book?type=one-way`, `return` or `multi-city`.

The `#trip-starter` form validates and navigates to `/book` with explicitly allowlisted `type`, `from`, `to`, `departure`, and (for return trips) `returnDate` parameters. No passenger or communication values are encoded in URLs. Unknown query keys are ignored; untrusted values are bounded/validated.

Other sections: `#what-you-receive`, `#your-account`, `#contact`, `#top`; skip link → `#main-content`.

Order: header; hero/trip starter; pricing; how it works; what you receive; illustrative sample; account preview; FAQs; closing action; footer.

## Phase-six public routes (implemented)

`/pricing` now includes an interactive shared-price estimator and a static compact comparison for no-JavaScript use. Public navigation indicates the current category and has a no-JavaScript mobile fallback. Page contents include feature/FAQ/source/related sections and collapse on mobile. Contact's final action opens existing orders; draft policy actions explain the services. Customer/staff layouts add keyboard skip links without changing authorization. Details: [UI_UX_REVIEW.md](UI_UX_REVIEW.md).

| Route                  | Content and internal links                                             |
| ---------------------- | ------------------------------------------------------------------------------ |
| `/dummy-ticket`        | Explain service, limitations, use cases; link to sample, pricing, FAQ and book |
| `/pricing`             | Configured prices and fees; link to book and refunds                           |
| `/how-it-works`        | Full workflow, email OTP and manual fulfilment; link to book and account       |
| `/sample-dummy-ticket` | Clearly watermarked sample and capabilities; link to service and book          |
| `/faq`                 | Expanded FAQs; link to contact and relevant policies                           |
| `/contact`             | Help routes and honest unavailable contact channels; no invented contacts                     |
| `/terms`               | Draft terms; business approval required; privacy/refunds/contact links                                |
| `/privacy`             | Actual collection, use, retention and rights; link to contact                  |
| `/refunds`             | Draft cancellation/refund decisions; no invented entitlements; contact link               |
| `/destinations`        | Destination index; link to destination detail and book                         |
| `/destinations/[slug]` | Sourced destination-specific information; no acceptance guarantees             |
| `/guides`              | Guide index; link to guide detail                                              |
| `/guides/[slug]`       | Sourced informational guide; link to service, FAQ and book                     |

## Booking and customer routes

### Implemented `/book`

Server-rendered page shell, with the interactive form inside Suspense for Next.js URL access. Four steps: trip details, passenger details, communication, review. Step Back/Next and review Edit buttons preserve values in memory. Progress indicator uses `aria-current=step`, and steps/errors receive focus. An expandable summary shows route, prices and counts on desktop/mobile. A refresh discards personal details and changes; query-string trip seeds may prefill again.

Final review validates the complete draft and opens inline numeric email OTP, preserving in-memory values. After verification, it saves the draft securely. Existing sessions are supported with explicit email reconciliation. Customers separately choose to create an unpaid order. Saved drafts resume at `/book?draft=<uuid>`; refresh restores the last saved revision, while unsaved edits are lost. New bookings retain separate drafts. Final policies remain a launch prerequisite.

| Route                       | Implemented behaviour                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `/book`                     | Four-step form, inline OTP, validated saved drafts, explicit unpaid-order creation |
| `/login`                    | Numeric OTP, resend/change-email/logout, allowlisted internal return paths |
| `/account/orders`           | Authenticated drafts/resume and owner-scoped order history |
| `/account/orders/[orderId]` | Owner-scoped details, price/policy snapshots, unpaid/not-started statuses and no-documents state |

All account routes require verified identity when configured; missing configuration displays unavailable state. Private requests have no-store headers. Unknown/inaccessible IDs share the same safe response. No private details are prerendered into shared shells.

API routes: `GET /api/auth/session`; `POST /api/auth/send`, `/verify`, `/logout`; `POST /api/bookings` with save/order actions; `GET /api/bookings/[id]` for draft resume. Mutations require same-origin JSON, bounded input and server validation; booking operations require verified identity. See SUPABASE_SETUP.md for schema, RPC and RLS boundaries.

## Deferred routes

`/admin/settings` and all payment gateway routes remain unimplemented. Unknown public pages and unknown destination/guide slugs return 404, not generated placeholder content.

## Phase-six content and discovery

`/destinations/france` and `/destinations/united-kingdom` contain sourced country-specific notes. `/guides/temporary-reservation-vs-paid-ticket`, `/guides/check-your-document-requirements` and `/guides/flight-hotel-date-checklist` contain dated, related articles. Collection pages link every detail page; home links collections, services, pricing and help. The shared footer reaches all public top-level routes.

Public routing uses 11 explicit route files backed by one content registry and renderer, plus separate destination/guide slug routes. Shared breadcrumbs, sources, related content and booking CTAs preserve the navy/teal design. `/sitemap.xml`, `/robots.txt` and `/social-image` implement discovery and sharing. Canonicals use the owner-approved `https://dummyticketonward.com`; preview remains noindex. Contact, terms, privacy and refunds remain noindex drafts even when launch indexing is enabled. See [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md) for configuration, approval and test procedures.
