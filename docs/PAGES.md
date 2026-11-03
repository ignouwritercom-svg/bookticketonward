# Routes and links

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

`/`, `/book`, `/login`, `/account/orders` and `/account/orders/[orderId]` are implemented. Login/account links open real routes. The shared public footer opens actual contact and draft-policy pages. The homepage contact explanation retains its accessible development notice. `/robots.txt` blocks preview indexing; account metadata and headers are noindex. Authentication and RLS, not robots rules, protect private data.

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
