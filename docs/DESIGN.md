# Visual system

## Grouped admin navigation — 5 November 2026

Refined the staff shell into a grouped sidebar, nested content/business links, detail-safe breadcrumbs and contextual module navigation. Mobile uses a modal navigation drawer instead of the eight-icon grid; search, focus, Escape, backdrop and resize handling are explicit. The command chooser searches only existing admin destinations and preserves the content editor's unsaved-change confirmation. The overview now has a workflow strip, priority queue and exception panel, followed by three-column functional module cards. Filter controls have explicit labels and collapsible grouping. Shared public/customer layouts, fonts, authentication and operational guards remain intact. This supersedes the mobile-grid description below.

## Staff operations workspace — 5 November 2026

Staff views now use a responsive sidebar/mobile grid inside the common site shell. Real operational metrics lead into the oldest paid queue, followed by management shortcuts. Document/content/customer libraries use consistent cards, status badges and contextual actions. Editors use labelled plain-text controls, collapsible sections/FAQs/cards/sources, reorder/add/remove controls, separate search/reference fields, explicit publication review and retained history. Existing order facts, PDF review and notes remain available. Payment facts are not represented as editable controls or fictional revenue charts.

No visual redesign of public/customer routes is included. Public fee/timing components now accept published runtime settings, while the editor schemas remain outside public booking bundles. Core content presentation templates and canonical URLs stay fixed. See [ADMIN_WORKSPACE.md](ADMIN_WORKSPACE.md).

## Customer workspace — 5 November 2026

Account pages now share a bounded desktop sidebar, active account navigation and responsive mobile icon grid. The existing site header/footer remain single shared instances. The overview puts actual metrics first, then next actions, drafts, recent orders and activity. Service icons, navy guidance, restrained status badges, consistent cards, 16px filter inputs, versioned document cards and a fact-based order-stage list provide hierarchy without decorative charts or fake activity. H1s retain Title Case; generic labels use sentence case.

Customer-only `desk-*` styles live in account.css and do not rebuild public/booking/staff views. Touch targets, focus, loading/empty/error states and reduced motion are preserved. Filter errors/session expiry hide stale rows and provide retry or reauthentication; filters never enter URLs. Private streamed screens require JavaScript and show a static explanation otherwise. Detailed behaviour and validation: [CUSTOMER_WORKSPACE.md](CUSTOMER_WORKSPACE.md).

Account secondary buttons have their own scoped styles, independent of booking CSS. The shared header permits its brand/menu to wrap at enlarged text sizes, keeps the menu target at 44px and constrains an open mobile menu to the remaining viewport. Non-interactive location-overlay help text cannot intercept clicks on the form beneath it; suggestion options and their scroll area remain interactive.

## Location comboboxes — 5 November 2026

Existing input geometry, labels, errors and form spacing are retained. A shared navy/teal suggestion overlay adds airport/country context, IATA badges, clear controls, loading/no-match/error states and explicit manual-entry guidance. Search does not claim inventory. Hotel cities show region/country and fill country only after selection. Each sector/stay keeps independent RHF values and focus after removal.

The editable ARIA combobox retains input focus, supports arrows/Enter/Escape/Tab and composition, announces results and scrolls its active option into view. Its overlay flips above a field when needed and measures the visual viewport; it does not add document layout shift. Labels/error references and readable type remain; lists scroll independently. Source attribution is available through the common footer's collapsed native “Data credits” disclosure, away from booking fields. Implementation and limitations: [LOCATION_SEARCH.md](LOCATION_SEARCH.md).

## Distinct public-page families — 5 November 2026

The brand/help/policy refinement supersedes the generic article-hero choice for About, Contact, Services, Terms, Privacy, Refunds, FAQ and How It Works. `brand-page.tsx` and its scoped stylesheet provide six purpose-specific families: brand narrative, service selection, help hub, policy reader, answer bank and process. Other editorial routes retain their existing layouts. Research and mapping: [PUBLIC_PAGE_REDESIGN.md](PUBLIC_PAGE_REDESIGN.md).

About and Services use restrained document-folio artwork made from CSS and existing icons, with a visible illustration disclaimer. The artwork contains no fabricated reservation, traveller, PNR, availability or payment confirmation. About has a large brand title and a navy purpose statement; Services adds a three-part fee strip and distinct service choices. Contact has account access and a six-topic grid. Policy pages use compact reference panels, tabs, stage/data summaries and numbered reading chapters instead of a marketing-card hero. FAQ puts native answers first; process shows the initial five request stages.

All retain the navy/teal identity, Title Case H1s, existing font stack, readable minimum type, shared navigation and focus conventions. Layouts stack on mobile; illustration geometry and caption clearance have an explicit browser regression. Policy navigation, topic anchors and account links work without JavaScript. No decorative motion, remote font, added image download, client-side library or global case transform.

## Rich public-page design — 5 November 2026

Public articles now pair a Title Case H1 and readable introduction with a page-specific navy/teal overview panel. Each panel summarises the decision the page supports and gives one contextual action: compare fees, inspect a sample, open an official source, find an existing order or prepare a request. The contact and policy pages retain their own help/service actions.

Sections support structured decision cards, ordered walkthroughs and practical checklists rather than long runs of unbroken prose. Card titles use H3 below their section H2; decorative numbers/icons are hidden from assistive technology. Desktop retains a bounded sticky contents list, while mobile keeps the native collapsed contents disclosure. Cards and overviews stack without shrinking text. Dark panels use explicit high-contrast text colours; buttons/focus, reduced motion and the existing shared header/footer remain.

Homepage service cards explain who each service fits, what to enter, the billing unit and a direct service-specific booking action. A dark service-explanation section distinguishes document fees from travel purchases, and the planning library replaces the former short link-only section with three guide previews and destination links. Illustrations use existing inline icons/CSS, with no new font, animation library, raster image or client component. Presentation styles have dedicated public/home selectors to avoid private-workspace collisions.

## Typography and case conventions — 4 November 2026

H1 page headings use Title Case, as explicitly requested by the owner: Dummy Flight Ticket & Dummy Hotel Booking, Book Dummy Ticket and My Orders. Keep short articles, conjunctions and prepositions lowercase within titles (for example, and, for and to); capitalise the first word and the first word after a colon. Public content titles are shared by H1s, metadata and structured data. Order-reference H1s retain their exact identifiers. Store the correct spelling in content rather than applying a CSS case transform.

Other generic UI uses sentence case: Book dummy ticket buttons, Account features and normal section labels. Preserve the approved service names when naming a product choice (Dummy Flight Ticket, Dummy Hotel Booking, Dummy Flight + Hotel Combo), the DummyTicket brand and real acronyms/codes such as OTP, PDF, INR, DEL and DXB. Never apply global uppercase, lowercase or capitalise transforms to user input or stored traveller names. Page-title components no longer append decorative full stops; sentence/question punctuation remains when part of the actual copy.

| Role | Shared size | Application |
| --- | --- | --- |
| Prose / form input | `--text-base: 1rem` | 16px at the default root size; inputs retain this size on desktop and mobile |
| Buttons / labels / compact information | `--text-sm: .875rem` | 14px; no mobile shrinking of button or field-label text |
| Secondary captions / hints | `--text-caption: .8125rem` | 13px minimum outside document illustrations |
| Sample-document annotations | `--text-document: .75rem` | 12px minimum inside the clearly labelled illustrative sample |

Headings use relative tracking rather than fixed negative pixel spacing, with page/card/section hierarchy kept distinct. Account cards and unavailable states use 24px headings; card subheads use 20px. Prices/counts use tabular numerals. Arial/Helvetica remains the font stack, with no new font download or dependency.

At narrow widths, the trip starter stacks its fields to keep native date/input text readable. The booking progress grid becomes two columns at 480px, preserving full step names. Trip radios wrap with readable labels and an explicit selected border; the swap action has a 44px target. Existing keyboard/focus and form state handling are preserved.

Homepage account features now use `.account-feature-grid`, separate from the customer/staff `.account-status` badge. The old shared selector caused homepage columns to become a yellow inline badge after client navigation loaded account CSS; the browser regression checks login → home explicitly. Typography checks inspect rendered text rather than just stylesheet declarations, including the existing public-page mobile audit.

## Customer-facing presentation — 4 November 2026

Retained the existing navy/teal visual system, shared navigation, page sections and booking layout. Removed the outdated development contact dialog in favour of a real help link. The homepage account panel now describes Save/Track/Download features without a fictional paid order; its small text is enlarged for readability. Footer labels describe destinations rather than unfinished implementation work. Policy pages carry a concise provisional notice, separate from the owner's operational checklist in the protected staff overview. Error copy tells customers what happened and how to retry, without asking them to fix backend configuration.

## Shared site header and footer

The root layout owns the single site header, footer and first-tab skip link. Home, public content, booking, login, customer account and staff routes use the same logo component, public navigation, menu breakpoint, link sizes and footer content. Individual pages own one focusable `main#main-content`; booking retains its inner `#booking-main` form scope and back-to-home link. Staff work links remain in a labelled toolbar inside the staff workspace, separate from the common site navigation.

Navigation consistently links to Services, Pricing, Destinations and Guides. The homepage's in-page sections and anchors remain available, while its header now follows the same navigation as other pages. The shared footer includes process, samples, FAQ, help, policies and account links on every screen. Brand icon/wordmark rendering is reused in header and footer. Short pages use the root flex layout to keep the footer below content without a separate page-specific footer.

## UI/UX refinement — 3 November 2026

Public footer navigation now uses 14px text and minimum 44px targets. Header navigation marks the current page/category, switches to its disclosure at 1100px to keep readable labels from colliding, and supports outside-pointer, blur, Escape and resize dismissal. The mobile menu overlays content without moving the page and scrolls within the available viewport. Native no-JavaScript navigation remains usable on mobile with a non-sticky header.

Pricing has compact comparison rows and a two-column fee estimator that stacks on mobile. The estimate uses shared prices and clear subtotal/discount labels. Article contents use a native collapsed mobile disclosure and bounded sticky desktop navigation. Contact and draft policy CTAs follow the user's current task. Customer/staff layouts provide skip links; route-level account loading has a stable placeholder panel. See [UI_UX_REVIEW.md](UI_UX_REVIEW.md) for measured findings and test boundaries.

Hotel extension adds three navy/teal service cards on the homepage and native service radios inside the existing booking wizard. Hotel-only hides flight fields; combo displays both. Hotel stays reuse labelled grid fields, add/remove focus handling and mobile stacking. Summary/review show each stay and a fee breakdown; a hotel fee is explicitly separate from accommodation costs. The combo card's price uses darker teal for AA contrast on pale mint.

Phase four reuses the existing account cards, navy/teal tokens and responsive typography for `/admin`. Overview uses real count cards; order lists use responsive cards with labelled reference/payment/fulfilment/date filters and explicit pagination. Staff details reuse the itinerary/passenger/price component, with separate private notes, document version controls and event history. Upload/publication/manual-delivery are distinct labelled actions; unavailable/denied/error/loading states do not suggest success. Status text remains readable without colour, and controls use native labels and `type=button` for mutations. Customer document links use ordinary authenticated attachment downloads, without shared caching or public file URLs.

Phase three preserves the navy/teal homepage and booking design, adding inline verification and customer account cards.

Direction: calm, professional travel paperwork service. Warm light backgrounds, deep navy text, teal actions, generous whitespace and readable editorial headings. No invented testimonials, affiliations, promotional urgency or airline-booking presentation.

## Tokens and layout

- Navy `#142b3e`; teal `#087f79`, hover `#06655f`; muted text `#60717b`; border `#dfe7e5`; pale mint `#edf5f2`.
- System Arial/Helvetica sans-serif: no remote font dependency. Large hero heading, clear section/card hierarchy and sentence-case section labels. Shared typography roles and minimum sizes are defined above.
- Container max 1160px, 40px desktop outer space, 20px mobile; section spacing 94px desktop and 62px mobile.
- Main actions use teal, white text, 6px radius and generous target height. Shadows and motion are restrained.
- Tailwind v4 is imported in globals.css. Shared semantic component classes keep the detailed visual system centralized. shadcn/ui is not needed for these native controls.
- Lucide supplies consistent line icons; icons supplement text labels.

## Components and rendering

`Header`: sticky desktop navigation and accessible mobile disclosure.
`TripStarter`: React Hook Form + Zod, radio-group trip choice, city fields, dates, swap and field errors.
`BookingForm`: four-step in-memory RHF form with shared Zod validation; small TripStep, PassengerStep, CommunicationStep and ReviewStep components. Shared field/checkbox components associate labels, hints and errors.
Homepage help: ordinary Next.js link to the server-rendered help page; no development modal or JavaScript dependency.
`SampleDocument`: reusable server-rendered HTML illustration, not a downloadable or real ticket. Persistent sample watermark and no invented PNR.
`OtpSignIn`: reusable labelled numeric-code controls with focus, rate-limit feedback, resend countdown and change-email. Inline booking authentication avoids navigation and nested forms. `OrderDetails`: server-rendered itinerary, passenger/contact, status, price and accepted-policy cards. Account styles live in `src/app/account/account.css`; cards stack on mobile and status always includes text. Missing configuration and no-document states make no success claims.
Homepage content, pricing, FAQ details and the account feature panel are server-rendered. The account feature panel does not display a fictional order or payment result.

## Responsive rules

At <=1100px, site navigation becomes a mobile disclosure; the existing content grids and forms retain their own breakpoints. At <=640px, hero, pricing, content/sample/account/FAQ become single-column. At <=360px, hero actions stack. Date controls and long copy must fit at 320px without horizontal scrolling. Native mobile inputs use 16px text to avoid automatic zoom.

Booking uses a wide form and sticky summary on desktop. Below 800px the summary moves above the form and remains keyboard-collapsible with native details/summary; below 640px inputs and review contact data stack. Booking styles live in src/app/book/booking.css and reuse global tokens/actions. Price/count updates use polite live regions. Step changes focus the heading; errors focus the relevant field; add/remove controls are explicitly non-submit buttons.

## Accessibility

Semantic landmarks, one h1, section headings, skip link, labelled input controls, radio fieldset, associated field errors and visible focus. Native `<details>` FAQs work by keyboard and without JavaScript. Native `<dialog>` supports Escape and focus containment. Mobile navigation exposes expanded state and closes on Escape or link selection. Respect prefers-reduced-motion: disable smooth scrolling and transitions. Do not communicate status only by colour. Sample content remains labelled as illustrative.
