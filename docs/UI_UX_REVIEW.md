# UI/UX review — 3 November 2026

## Follow-up: consistent site header and footer

The owner requested a site-wide consistency check. Inspection found that the homepage and public pages used different header links; booking used a separate small footer; login had no site header/footer; and customer/staff layouts had text-only logos and no common footer. These were visible inconsistencies rather than intentional variations in business workflow.

The root layout now owns the common header/footer and first-tab skip link. A shared Brand component renders the same icon and wordmark. Route layouts no longer duplicate site headers or footers. Login, booking and account screens receive the common navigation and help/policy links; staff retains a clearly labelled workspace toolbar. All page main landmarks have a consistent focus target, with the booking form's existing inner scope retained. Header sign-in text is 14px with a minimum 44px target; the menu button is 44px square. The booking back link remains available near its introduction.

The default not-found view also uses the common layout. Unknown destination/guide URLs are routed to the unmatched-route 404 before their dynamic shell can stream, with the original browser URL preserved. Actual HTTP 404 and noindex checks remain required alongside visual consistency.

`tests/site-shell.spec.ts` compares header navigation, brand markup and footer contents across every registered public route and the booking/login/customer/staff routes. It checks one header/footer/main/skip link, consistent header height, widths from 320 to 1440px, keyboard focus/menu dismissal, mobile automated accessibility and no-JavaScript help/navigation. Evidence uses the existing unique run-directory workflow. Final results are recorded in PROGRESS.md.

This pass follows the owner's request for deeper production-quality work. It evaluates concrete interaction and layout problems rather than treating automated accessibility passes as a complete UX review. Existing navy/teal styling, booking validation, authentication, pricing and payment restrictions are preserved.

## Findings and changes

| Finding | Evidence before changes | Implemented correction |
| --- | --- | --- |
| Public footer is difficult to read and tap | Rendered mobile footer links were 11px text and approximately 18px high | Public footer links now use 14px text and minimum 44px targets; policy/disclaimer text is readable at 12–13px |
| Pricing requires scanning repeated large cards and doing group/stay arithmetic | Pricing page was 4,701px high at a 390px viewport; five repeated service cards | Compact comparison rows and a fee estimator using the existing integer-paise quote function; no separate pricing formula |
| Visitors cannot tell which public navigation category is active | No `aria-current` on pricing navigation | Active page/category indicators, including nested destination/guide pages |
| Open mobile menu can remain after moving focus or changing screen size | Menu only closed on link selection or Escape | Close on outside pointer interaction, keyboard focus leaving the header, and desktop resize; Escape still restores focus |
| Mobile navigation depends entirely on JavaScript | Mobile button has no no-JavaScript action | Dedicated server-rendered no-JavaScript navigation; inactive menu button hidden in that mode |
| Page contents list omits major sections and takes too much mobile space | Pricing list omitted price comparison; source/FAQ/related sections not consistently included | Complete contents list, collapsed native disclosure on mobile and bounded sticky navigation on desktop |
| Every public page ends with the same booking action | Help/contact and draft policies also promoted starting another booking | Contact leads to existing orders; draft policies lead to service scope; service/articles retain booking actions |
| Customer and staff layouts lack keyboard bypass links | Account layout had no target ID or skip link; staff layout had only a target | Focusable main landmarks with first-tab skip links; account route-level loading shell added |
| Native dropdown labels can be clipped despite no page overflow | Visual inspection at 320px showed truncated service, trip and traveller values | Short, explicit dummy-service labels and single-column controls below 480px; regression checks measure every option against available text width at eight viewport widths |
| New comparison rows reused homepage selectors | Rendered price rows inherited homepage card borders and rounding | Dedicated `fee-comparison` selectors keep the public comparison independent of homepage pricing styles |
| Opening the mobile menu moves the entire page | Menu was in normal header flow, changing the sticky header's height | Bounded overlay beneath the header preserves document position, with outside/keyboard dismissal and internal scrolling in landscape; the performance test asserts the main content does not move |

The baseline 4,701px page length is not a promise that every new page is shorter: readable footer targets and a useful estimator also require space. The aim is faster comparison and clearer actions, not minimum document height.

## Fee estimator boundaries

- Service, trip type, traveller count and number of stays only; no personal information is collected or stored.
- Shared `getReservationQuote` and `business` constants; amounts remain integer paise.
- Explicit flight/hotel subtotals, once-per-traveller combo discount and overall total.
- Hotel-only hides the flight trip field; flight-only hides the stay field. Switching service preserves selected values in memory for comparison.
- Booking link passes only the existing service/trip-type allowlist. Copy explicitly states travellers and stays must be entered in the booking form; no promise that the estimator creates or saves an order.
- Payment remains on hold; estimate is not an invoice, payment confirmation, airfare or room rate.
- Without JavaScript, interactive selectors are hidden so changing a native select cannot misleadingly leave an old total visible. Static price comparison remains fully available.
- The expanded no-JavaScript navigation uses a non-sticky header, so its extra height cannot obscure section anchors.

## Verification scope

`tests/ux.spec.ts` adds meaningful scenarios for price boundaries and service switching; safe booking handoff; active navigation; outside/blur/Escape/resize dismissal; landscape menu reachability; footer target sizes; complete section anchors; context-specific CTAs; no-JavaScript use; customer/staff keyboard bypass; widths from 320 to 1440px; enlarged reading text and automated accessibility.

The complete existing suite also exercises synthetic/mocked OTP, saving/reconciling drafts, unpaid order creation, private route denial, booking validation, hotel/combo flows, SEO, mobile layouts, keyboard interaction and local performance. These are not new live Supabase integration results. The account/staff rendering checks use isolated or synthetic states; no real customer records are modified.

Evidence is retained outside Playwright's disposable directory, in `test-results/ux-review-20261103`. That directory contains baseline metrics and the final mobile/desktop pricing screenshots. `test-results/browser` alone is cleared automatically by Playwright. Do not move historical live evidence into that disposable directory.

The first throttled performance sample recorded a homepage interaction of 232ms; a separate recheck recorded LCP 2,684ms and interaction 408ms. Those target misses are retained in `performance-first-run.json` and `performance-before-menu-overlay.json`, not discarded because the functional tests passed. The article pages met the sampled targets in both runs. The menu layout correction addresses page movement; subsequent measurements must establish its observed effect and do not prove field INP or causation for every timing variation.

After the overlay correction, the full-suite lab sample measured homepage LCP **2,028ms**, sampled interaction **96ms**, and CLS **0**. Pricing/FAQ/France measured LCP **708–1,180ms**, sampled interaction **72–104ms**, and CLS **0**. All four measured pages met the sampled targets, with zero font requests. Main content stayed in the same position when opening navigation. This is an observed improvement in this run, not a guaranteed field result; earlier misses remain recorded above. Final data: `test-results/public-performance.json`.

## Honest release boundaries

Passing these checks does not establish zero possible defects. Actual iOS Safari/Android devices, assistive-technology testing and approved live business operations still need validation before launch. Automated Chromium, axe and enlarged-text checks do not replace those tests. Business identity/support details, final policies and payment-provider approval remain outstanding; none can be fabricated to make the preview look finished.

No deployment, migrations, real payment processing or authentication/security bypass is part of this review. Refer to PROGRESS.md for actual final command results and any corrections found during verification.
