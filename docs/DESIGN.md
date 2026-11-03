# Visual system

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
- System Arial/Helvetica sans-serif: no remote font dependency. Large hero heading, 30–40px section headings, short uppercase section labels.
- Container max 1160px, 40px desktop outer space, 20px mobile; section spacing 94px desktop and 62px mobile.
- Main actions use teal, white text, 6px radius and generous target height. Shadows and motion are restrained.
- Tailwind v4 is imported in globals.css. Shared semantic component classes keep the detailed visual system centralized. shadcn/ui is not needed for these native controls.
- Lucide supplies consistent line icons; icons supplement text labels.

## Components and rendering

`Header`: sticky desktop navigation and accessible mobile disclosure.
`TripStarter`: React Hook Form + Zod, radio-group trip choice, city fields, dates, swap and field errors.
`BookingForm`: four-step in-memory RHF form with shared Zod validation; small TripStep, PassengerStep, CommunicationStep and ReviewStep components. Shared field/checkbox components associate labels, hints and errors.
`DevelopmentNoticeProvider` / `DevelopmentAction`: native dialog, labelled explanations, Escape/close handling and modal keyboard containment.
`SampleDocument`: reusable server-rendered HTML illustration, not a downloadable or real ticket. Persistent sample watermark and no invented PNR.
`OtpSignIn`: reusable labelled numeric-code controls with focus, rate-limit feedback, resend countdown and change-email. Inline booking authentication avoids navigation and nested forms. `OrderDetails`: server-rendered itinerary, passenger/contact, status, price and accepted-policy cards. Account styles live in `src/app/account/account.css`; cards stack on mobile and status always includes text. Missing configuration and no-document states make no success claims.
Homepage content, pricing, FAQ details and account illustration are server-rendered. The account example is explicitly illustrative; its statuses are not a transaction result.

## Responsive rules

At <=1100px, site navigation becomes a mobile disclosure; the existing content grids and forms retain their own breakpoints. At <=640px, hero, pricing, content/sample/account/FAQ become single-column. At <=360px, hero actions stack. Date controls and long copy must fit at 320px without horizontal scrolling. Native mobile inputs use 16px text to avoid automatic zoom.

Booking uses a wide form and sticky summary on desktop. Below 800px the summary moves above the form and remains keyboard-collapsible with native details/summary; below 640px inputs and review contact data stack. Booking styles live in src/app/book/booking.css and reuse global tokens/actions. Price/count updates use polite live regions. Step changes focus the heading; errors focus the relevant field; add/remove controls are explicitly non-submit buttons.

## Accessibility

Semantic landmarks, one h1, section headings, skip link, labelled input controls, radio fieldset, associated field errors and visible focus. Native `<details>` FAQs work by keyboard and without JavaScript. Native `<dialog>` supports Escape and focus containment. Mobile navigation exposes expanded state and closes on Escape or link selection. Respect prefers-reduced-motion: disable smooth scrolling and transitions. Do not communicate status only by colour. Sample content remains labelled as illustrative.
