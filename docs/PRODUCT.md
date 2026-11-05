# Product and current scope

## Separate admin sign-in — 5 November 2026

Customers continue to use `/login`. Administrators use the direct `/admin-login` URL, without a public navigation or sitemap link. Both retain the configured email OTP provider; the admin entry accepts existing accounts only and requires an independently verified active staff role after OTP. Admin logout returns to that dedicated entry. Shared identity sessions remain intentional: separate entry screens do not create separate passwords, grant roles or replace server authorization. Customer login return URLs cannot enter the staff workspace. No database, credentials, payment or deployment changes are required.

## Admin navigation refinement — 5 November 2026

Added grouped Reservations/Website & Business/Monitoring navigation, nested editor links, breadcrumbs, context links, keyboard section search and a mobile drawer. The overview prioritizes real queues/exceptions and separates reservation tasks from website management. Existing staff authorization, CMS publication/unsaved-edit handling, paid-only document operations and customer ownership are preserved. No new backend capability, migration, credential or deployment is introduced by this refinement.

## Admin operations and no-code management — 5 November 2026

Expanded the existing staff workspace with paid-work queues, a document library, submitted-order customer directory, content/FAQ/guide/destination editing, homepage/support/timing settings, runtime service pricing, versioned booking acceptance policies and revision/audit views. Existing verified staff accounts remain the only operators; no role hierarchy or staff-grant UI is added. Draft → saved preview → review/publish and optimistic revisions keep routine website updates out of source files. Restore creates a draft rather than silently changing public content.

One additive fifth migration and an explicit server enable flag are required for persistent website management; neither is applied automatically. Enabled public views and server/database repricing share the canonical catalog. Existing order totals/policy snapshots, customer ownership, RLS, private documents and paid-only preparation remain intact. Payments remain on hold; there is no manual paid or gateway-enable action. Setup, exact scope and test limits: [ADMIN_WORKSPACE.md](ADMIN_WORKSPACE.md).

## Customer workspace expansion — 5 November 2026

Customers now have a dedicated overview, separate saved drafts, searchable/paginated order history, private document library, activity, account/security and contextual help. Metrics and rows use real owner-scoped data; no example bookings or balances appear in the application. Order search/filter/sort/page requests use a bounded authenticated POST and return minimal summaries, keeping passenger/contact details out of list payloads, URLs and browser storage. Document listings require paid own orders and current publication; downloads retain all existing independent authorization checks.

The sidebar/mobile navigation and card layouts share the existing identity and public header/footer. A current-state progress list keeps payment, preparation and PDF availability distinct. Draft resume, notifications and sign-out retain their working backend flows. Settings shows verified identity and guidance; unsupported profile edits, payment/refund/cancellation and support-ticket controls are not invented. No migration/security/credential change, remote mutation or deployment. Architecture, routes and test separation: [CUSTOMER_WORKSPACE.md](CUSTOMER_WORKSPACE.md).

## Booking form copy cleanup — 5 November 2026

Removed the prominent location-provider attribution sentence from homepage/booking forms. The common footer now offers a collapsed “Data credits” disclosure with required GeoNames credit, licence, adaptation notice and OurAirports reference, usable without JavaScript. No source names, dataset counts or implementation details are added to the booking steps. The source credit remains publicly accessible; it is not private business configuration. Existing service limitations, autocomplete behaviour, data protection and payment restrictions are unchanged.

## Booking location selection — 5 November 2026

Flight fields on the homepage and every booking sector now support city/airport/IATA suggestions; hotel-only and combo stays support destination-city/country search with country auto-fill on explicit city selection. Editing a city selected in the current step clears its derived country, while manual country overrides remain user-owned. Country preferences do not lock city search, including when returning to an existing stay. Existing free text remains supported, including when search is unavailable. The optional hotel/area preference is still manual: there is no live hotel-property inventory. No availability, paid travel or confirmed reservation is implied.

Reference names are served from an attributed server-only OurAirports/GeoNames snapshot via a bounded same-origin API. No credentials, third-party typing requests, browser storage, new npm dependencies or change to pricing/payment/auth/database/security is involved. Research, behaviour and provenance: [LOCATION_SEARCH.md](LOCATION_SEARCH.md).

## Dedicated brand, help, service and policy pages — 5 November 2026

Added a genuine `/about` page covering the service purpose and approach without invented people, founding dates, accreditations or company history. The existing service, contact, terms/privacy/refunds, FAQ and process URLs now use purpose-specific page families rather than the guide/article layout. Service fees still use shared integer-paise prices; Contact is a working help hub with real task links rather than an undeliverable enquiry form. Policy tabs, draft/order/document distinctions and full readable chapters make provisional policy information easier to use.

There are now 18 public URLs, including About. Its metadata and visible content use AboutPage structured data; Contact uses ContactPage. All draft/indexing/access controls remain. The common footer makes About discoverable across public and private workspaces. Research decisions and source links are in [PUBLIC_PAGE_REDESIGN.md](PUBLIC_PAGE_REDESIGN.md). Legal/operational approvals remain outstanding and no live gateway or deployment is included.

## Public content depth and decision support — 5 November 2026

Home and all 16 editorial public URLs now offer more practical detail. Service comparisons explain flight-only, hotel-only and combo choices; pricing includes shared-quote group/stay examples; process content distinguishes drafts, orders, preparation and available documents. Samples explain what to inspect, help covers concrete account/document issues, and guides add a requirement worksheet and an overnight-arrival example. Destination additions remain planning checklists supported by the existing official sources. Provisional policies gain workflow explanations without invented legal terms, eligibility, refund deadlines, retention periods or support contacts.

Public pages use an overview panel, structured cards, walkthroughs, checklists and contextual next actions. The homepage adds richer service cards, a service-value explanation and a guide/destination library while preserving the trip starter and all working flows. Price examples derive from the existing integer-paise quote function. No authentication, order-state, payment, fulfilment or security change is included.

This is a content/design improvement, not measured conversion uplift. Purchase conversion remains limited by payments being unavailable; direct support details and final policies are still unapproved. No analytics/tracking has been added. Subsequent measurement needs an explicitly approved, privacy-conscious plan and functioning approved business operations.

Typography/case follow the [shared visual conventions](DESIGN.md): readable body/input sizes, Title Case for H1 page headings, sentence case for other generic UI and preserved formal service names/acronyms. Public title metadata and structured data share the editorial H1 titles. Order-reference headings retain their exact identifiers. Display-copy and scoped style changes do not transform user data, alter booking/policy snapshots or change service fees. Home account features remain visually consistent after account-route navigation.

## Customer-facing content review — 4 November 2026

Public copy describes the available dummy flight, dummy hotel and combo request service without implementation phases, setup instructions or business approval tasks. Homepage help opens the actual help page; account messaging reflects implemented private downloads, and a feature panel replaces the fictional paid-order illustration. Customer-facing failures explain the outcome and retry path rather than directing customers to configure Supabase or apply SQL.

Online payments remain unavailable and this is stated at the trip starter, fee estimator, pricing, process, FAQ, booking and unpaid-order screens. Saving does not charge, reserve travel or initiate fulfilment. Prices, authoritative policy text/versions, accepted snapshots, authentication, RLS and paid-only document rules are unchanged. The terms, privacy and refund pages still explicitly identify their provisional status and remain noindex; the contact page provides self-service help and accurately states that direct contact is unavailable. The owner confirmed support contacts are **not final**.

Owner tasks are in the authenticated staff overview and [LAUNCH_READINESS.md](LAUNCH_READINESS.md), including the separate deployed account-configuration problem. No deployment, credentials change or remote mutation was performed during this review. Earlier descriptions of development banners/popups below are historical and superseded by this section.

The shared root site layout now provides one consistent header/footer across public pages, booking, login, customer and staff routes. Staff navigation remains a labelled workspace toolbar. This is a presentation consolidation: booking data handling, OTP, ownership/staff authorization, payment restrictions and document operations remain unchanged. See [DESIGN.md](DESIGN.md) for the shared layout conventions.

## Phase 7 transactional notifications

Committed orders, paid processing transitions and authorized document publication/withdrawal now create durable, deduplicated notification jobs in the same database transaction. Customers see owner-scoped account activity and can explicitly mark updates read; staff has a protected notification log, failure alerts and guarded retry actions. Account emails use the verified sign-in email separately from the chosen manual document-delivery channel. SMTP acceptance does not mean inbox receipt, reading or external ticket delivery.

The separate Node worker supports default local capture and a replaceable server-only SMTP adapter, with Gmail as the temporary development provider. Missing configuration does not send email; OTP dashboard SMTP is not inherited. A restricted worker role, fenced leases, bounded backoff, attempt history and explicit ambiguous-delivery review protect the outbox. No real email or remote migration was performed. See [NOTIFICATIONS_SETUP.md](NOTIFICATIONS_SETUP.md) for the additive fourth migration, setup, safe testing and production worker requirements.

Verified-payment notification is an interface only; there is no payment producer or manual paid control. Payment and fulfilment restrictions remain unchanged. WhatsApp and document external delivery remain manual. This explicitly authorized Phase 7 scope supersedes earlier phase descriptions that deferred all transactional messaging; historical delivery/payment implementation notes below remain otherwise unchanged.

## Phase 6 public content and SEO

The subsequent [UI/UX review](UI_UX_REVIEW.md) adds a pricing fee estimator and compact comparison. It collects no personal data and calculates through the existing shared quote function. Its booking link carries only service/trip type; traveller and stay entry remains in the validated booking form. Help and policy pages now use context-specific next actions. Actual prices, order snapshots and payment restrictions are unchanged.

All requested public routes now have useful server-rendered content: service, pricing, process, watermarked flight/hotel samples, FAQ, help/contact, draft terms/privacy/refunds, destinations and guides. The first curated destination collection covers France and the United Kingdom using official sources; three practical guides explain reservations vs paid travel, checking requirements and aligning flight/hotel dates. Country listings do not imply document acceptance or a need to order.

The owner-approved canonical domain is `https://dummyticketonward.com`. Development indexing stays disabled unless an explicit launch setting is enabled. Draft policy/contact pages remain noindex pending individual business approval. No invented support channel, author, legal identity, review or visa guarantee is published. The typed repository content model can later feed a controlled CMS. Details and release prerequisites: [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md).

Existing service prices, immutable policy snapshots, OTP, customer/staff access and paid-order fulfilment restrictions are unchanged. Payment processing remains on hold; no new migration, remote database operation or deployment is part of Phase 6. The historical phase-three notes further below are retained as history and do not supersede the current Phase-four implementation.

Public service names are **Dummy Flight Ticket**, **Dummy Hotel Booking** and **Dummy Flight + Hotel Combo**. Use these names in marketing, booking and account/admin labels. Explain temporary reservations and service-fee limitations in supporting copy; do not imply paid airline tickets or hotel accommodation.

Phase 5 is architecture only: [payment proposal](PHASE5_PAYMENTS_ARCHITECTURE.md). Gateway selection, collection and refunds are not implemented. Proposed financial states remain separate from fulfilment, and only verified gateway evidence may establish payment; customers/staff never manually mark orders paid.

## Hotel and combo extension — 2 November 2026

The site now offers flight reservations, hotel reservations and a single Flight + Hotel order. Hotel-only bookings have no flight sectors; combo travellers/contact are entered once. Up to four non-overlapping stays collect city, country, check-in/out, rooms and optional property/area preference. All travellers appear on each stay. Room count cannot exceed travellers; max 30 nights per stay. No hotel inventory, accommodation payment or confirmation reference is invented.

The user approved hotel ₹699/traveller/stay, standard combo ₹1,199/traveller and multi-city combo ₹1,499/traveller for one hotel. Additional stays add ₹699/traveller; the ₹199 combo discount applies once per traveller. Existing flight fees remain ₹699/₹999. These are service fees, not room rent or airfare. App and PostgreSQL enforce integer pricing and separate reservation-policy snapshots.

Customer/admin views show service and stays. Document types distinguish flight/hotel/combined PDFs; a combo needs both types or a combined PDF before ready/delivery. Setup: [HOTEL_SETUP.md](HOTEL_SETUP.md). Market comparison: [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md). All changes use a third additive migration; prior migration files and `.env.local` remain unchanged.

## Phase-four implementation

Staff overview, paginated/filterable order management, full order snapshots, private notes and audit history are implemented at `/admin`. A private database role table controls existing verified Supabase users; no signup promotion, customer-writable role or public role-assignment endpoint exists. Revocation is checked on each operation. Staff sees orders through additional SELECT policies; customer owner policies remain unchanged.

Payment and fulfilment remain independent. Only paid orders can move from Not started to Processing, then Documents ready after validated upload, and Delivered after explicit manual-delivery confirmation. The app cannot mark an order paid. No genuine customer payment is changed by implementation or tests.

Versioned PDFs use a private bucket, server-side size/extension/MIME/signature validation and UUID object names. Upload, explicit dashboard publication, withdrawal and manual external delivery have separate states/events. Customers see only published, non-withdrawn versions on their own paid orders and use an authenticated no-store download endpoint. Private notes/audit are separate staff-only tables. Contact links open compose windows and contain only the selected contact and order reference, never passenger details.

Setup and limits: [ADMIN_SETUP.md](ADMIN_SETUP.md). Customer development OTP/order persistence and admin access are user-confirmed. Actual document integration passed 40 checks against development services using three synthetic users and two uniquely labelled orders; only the synthetic paid fixture was seeded paid. Test accounts are disabled and test staff access revoked. Original migrations and `.env.local` were not changed during integration; broader concurrency/expiry/failure-recovery checks remain documented separately.

The older phase-three sections below describe the retained booking foundation. Where they describe documents/admin as future work, the Phase-four implementation above supersedes that historical limitation; payments and deployment remain future work.

DummyTicket is an editable placeholder brand for a manually fulfilled **Dummy Ticket** service, not an airline booking portal. The homepage uses “Dummy Ticket for Visa” and “Book Dummy Ticket”.

A dummy ticket is a temporary reservation document. The service fee does not purchase a paid airline ticket. Do not promise visa approval, universal acceptance, boarding eligibility or a fixed validity period.

## Intended workflow (payments and staff fulfilment remain later phases)

1. Customer enters trip and passenger details.
2. Customer selects WhatsApp or email delivery.
3. Customer signs up/signs in with an email OTP before payment. Login email is required separately from delivery preference.
4. Customer saves a reviewed draft and creates an unpaid order. Gateway payment is a later phase.
5. The order appears in the customer account.
6. Staff manually prepares the dummy ticket.
7. Staff uploads the document privately to the order.
8. Staff sends it through the selected delivery channel.

## Editable development defaults

Source of truth: `src/config/business.ts`. These are provisional until launch.

| Setting                    | Default                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| Brand                      | DummyTicket                                                       |
| One-way, per passenger     | INR 699                                                           |
| Return, per passenger      | INR 699                                                           |
| Multi-city, per passenger  | INR 999                                                           |
| Maximum multi-city sectors | 4                                                                 |
| Maximum passengers | 6 per draft (configurable development limit) |
| Currency                   | INR                                                               |
| Delivery target            | 30–60 working minutes after verified payment and complete details |
| Working hours              | Daily 09:00–21:00 Asia/Kolkata                                    |
| Delivery channels          | WhatsApp or email                                                 |
| Contact details            | Unset; never invent addresses, phone numbers or email addresses   |

## Implemented now

Next.js App Router, TypeScript, Tailwind CSS, the existing server-rendered homepage and a four-step `/book` UI: trip, passengers, communication and review. The homepage starter passes only an explicitly allowlisted trip type, first route and dates into `/book`. Header, hero, pricing and footer booking actions open the booking flow; pricing links preselect the type.

React Hook Form keeps unsaved values in memory across steps, review edits and inline email OTP. No booking data enters localStorage/sessionStorage, analytics or logs. Before saving, refresh discards personal details. After verified authentication, the reviewed draft is persisted through same-origin server endpoints to the configured Supabase project. Saved drafts resume by opaque UUID from the dashboard; unsaved edits still require explicit Save. Separate new drafts are never silently replaced. Missing configuration shows an honest unavailable state, with no fake authentication. Setup and live verification steps are in SUPABASE_SETUP.md.

### Trip and passenger rules

- One-way has one outward sector; return adds the reverse journey and return date. Multi-city has two to four sectors, in nondecreasing date order. Same-day sectors are allowed because flight times are not collected. Different onward origins (open-jaw journeys) are allowed. Each sector requires different normalized origin/destination text; past and impossible travel dates are rejected.
- Cities/airports are manual text entries, including locations outside any future airport dataset. There is no live airport dataset, flight search, availability or fare claim in this phase. City aliases are not resolved; e.g. “DEL” and “New Delhi” are not yet identified as the same location.
- One to six passengers, configurable through `business.maxPassengers`. Six is a development UI limit, not an airline rule. Every passenger uses the configured per-passenger service fee; no age-based pricing is invented.
- Given/middle names and surnames accept Unicode letters/marks, spaces, apostrophes, periods and hyphens. Single-name passengers enter the complete name in the given-name field; a surname is neither required nor displayed in review. Toggling the option preserves prior input in memory.
- DOB must be a real calendar date, not in the future, and on/before the first departure. Sex uses the travel-document markers F, M or X. Nationality is optional. No passport number, document upload or postal address is requested.
- Switching from multi-city to one-way/return retains the first sector and removes the additional sectors; other step values stay intact. The UI caps arrays and the schemas independently enforce the limits.

### Communication and review

Account email is always required and must match the verified session before saving. A mismatch requires explicit reconciliation and renewed confirmation, or sign-out to verify the intended email. Email delivery uses this account email. WhatsApp independently requires a +country-code number with 7–15 digits; spaces, parentheses and hyphens are allowed. This is structural validation, not verification of a phone/WhatsApp account. Alternate contact, purpose, appointment date and instructions are optional. Appointment dates cannot be past; instructions are capped at 2,000 characters.

Review shows all sectors (including the reverse return sector), passengers, account email, delivery contact, optional information, unit price/count/total, configured hours and conditional delivery estimate. Edit actions return to the corresponding step. Passenger/trip confirmation and acceptance of explicitly labelled draft service terms are mandatory to continue the preview. Editing details clears the correctness confirmation. Final published terms/privacy/refund policies remain a launch prerequisite.

### Pricing and persistence

The private price/policy catalog has RLS enabled without client policies, in addition to revoked PUBLIC/anon/authenticated schema/table access. Only the trusted owner-executed order operation reads it. Customer table RLS and narrow RPC grants remain unchanged.

`business.prices` now stores integer paise: 69,900 for one-way/return, 99,900 for multi-city. `getBookingQuote` multiplies integer unit price by passenger count; `formatPrice` converts only for display. These remain the same INR 699/999 prices. All homepage and booking prices share this configuration.

`BookingDraft` is incomplete form input; `ValidatedBooking` is validated output. Shared schemas validate form and authenticated endpoints. The server calculates prices; the database independently enforces a private catalog and captures immutable price/policy snapshots. Update business config and catalog together through a new migration. Stale draft revisions fail without overwriting. Order creation is transactional and idempotent, with database-derived ownership and no direct customer mutation grants.

## Customer account implemented

`/login`, `/account/orders` and `/account/orders/[orderId]` provide email OTP, saved-draft resume, order history, routes/dates/passengers, amount/currency, communication and policy snapshots. Orders show Awaiting payment and Not started. Payments are not enabled yet; no documents are available. Protected server reads and database RLS enforce ownership. Private pages remain noindex and no-store. Private downloads and support actions remain later work.

## Later-phase administration

Staff authentication; orders list and filters; passenger/trip/contact details; independent payment and fulfilment statuses; WhatsApp/email contact actions; private document upload; internal notes; editable business settings. Enforce server-side staff authorization. Never expose internal notes to customers.

## Architecture and security

Next.js endpoints use Supabase publishable-key access and verified customer sessions. Every exposed customer table enables RLS; narrow database operations enforce validation, ownership, price and status boundaries. No privileged secret key is used. SSR cookie refresh uses the Next.js 16 proxy; private content is uncached. No Storage bucket or delivery notifications are configured. Future documents require private Storage and short-lived authorized downloads. Payment integration must verify webhook signatures, authoritative amounts and idempotency; redirects never establish success. No real Supabase target was configured during implementation.

## Open decisions before launch

Final brand/domain; verified contacts and business identity; final hours and delivery target; reservation provider and actual document capabilities; reservation validity behaviour; existing gateway details; taxes and final fee presentation; modification and cancellation rules; terms/privacy/refund policies; retention/deletion periods; OTP expiry/rate limits; staff roles; supported airport data; delivery-email handling when different from login; notification delivery and retry rules. Do not invent answers to these decisions.
