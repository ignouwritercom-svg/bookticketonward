# Flight and hotel destination suggestions

Reviewed 5 November 2026. This change adds location selection to the existing booking flow; it does not create reservations, inventory, availability or payments.

## Competitor research

Inspected public forms with Chromium, without submitting bookings, passenger details or payments:

| Source | Observed behaviour | Decision for this site |
| --- | --- | --- |
| [FlyDummyTicket](https://flydummyticket.com/) | Flight origin/destination selects with city/country/IATA labels. Hotel and Combo tabs also expose destination/location selects and dates. No live hotel-property inventory was observed. | Offer discoverable location choices in flight, hotel and combo forms, with explicit selection and readable supporting labels. |
| [DummyTicket.com booking form](https://www.dummyticket.com/dummy-ticket-for-visa-application/) | From/To city text fields and a searchable country control. No airport suggestion list appeared when entering Delhi in the inspected session. | Keep manual entry and country search; do not claim all competitors have the same autocomplete. |

DummyTicket.shop could not be inspected reliably because of failed/time-out responses. No claim is based on that site. Native selects on a competitor are not evidence of live supplier availability. No competitor guarantees, acceptance/validity promises, PNRs, booking details, contact-data handoffs or prices were copied.

Local read-only evidence: `test-results/location-research-84060f88-e30f-4284-aff0-085b65402f6f/` (ignored), including public controls, Hotel/Combo interactions and screenshots.

## User behaviour

- Homepage and every flight sector: focus reveals example airport choices; type two or more characters to search city, airport name, IATA code and available aliases. Exact IATA codes rank first. Choices show airport and country to distinguish locations. One-way, return, multi-city, route swap and homepage handoff preserve the existing contracts.
- Hotel-only and combo stays: city suggestions distinguish region/country; an explicit selection fills Country. Editing a city selected in the current step clears its derived country. A manually edited country is retained and prioritises equal-quality city matches when recognised. Country is a preference, never a hard lock: returning to an existing stay still allows a different country, and choosing its city updates Country. Each stay owns its pairing independently, including after removing/reordering entries.
- Country also has its own search. Optional hotel/area preference remains manual because this project has no verified hotel-property inventory. City search is not a property availability search.
- Typing never commits the first suggestion. Arrows highlight; Enter chooses the highlighted option. Enter with no highlighted option closes suggestions and preserves text. Escape dismisses; Tab moves focus normally. Composition input does not accidentally select. Pointer/touch selection keeps the existing input value and keyboard focus.
- Clear is a non-submitting button. Keyboard users can clear through normal text editing. Field validation, RHF focus/error handling, all existing field limits, shared Zod validation, pricing, dates, saved snapshots and APIs remain authoritative.
- Unknown places, unavailable lookup and no matches allow manual entry under existing validation. Suggestions are not a required allowlist.

## Data, privacy and delivery

The committed snapshot contains 5,334 IATA airports, 31,807 cities and 249 countries/territories. It derives from [OurAirports Public Domain data](https://ourairports.com/data/) and [GeoNames](https://download.geonames.org/export/dump/readme.txt), under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution, licence and adaptation notices are available in the common footer's collapsed native “Data credits” disclosure. This keeps provider details away from booking fields while retaining public credit; it does not make public dataset sources confidential. The disclosure supports keyboard/touch and works without JavaScript. Fields, exclusions, provenance, checksum and manual refresh are documented in [src/data/LOCATIONS.md](../src/data/LOCATIONS.md). Sources may be incomplete or outdated; the snapshot is not refreshed on each build.

`POST /api/locations` accepts only `kind`, bounded `query` and optional `country`, with a strict schema, same-origin check and existing 32KB JSON-body limit. It returns at most eight names with public labels/codes; search indexes and popularity weights remain on the server. Responses are private/no-store/noindex. The client debounces for 180ms, aborts superseded requests and times out after five seconds. It reuses the current successful query result in component memory when reopened, avoiding a redundant loading flash; a changed query/country or remounted component performs a new lookup. It sends no passenger/contact/booking object, stores nothing in browser storage and makes no third-party typing requests. POST keeps lookup text out of URL/query strings; custom request-body logging is not added.

The gzip snapshot is read and cached by a `server-only` module in the Node route. No Supabase key or new environment variable is required. `next.config.ts` explicitly includes it in the route file trace for deployment. Do not move the dataset into `public` or import it into a client component. No new npm dependencies or runtime network provider.

The combobox follows the [W3C APG editable list pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/): labelled input, listbox/options, active descendant, input focus, announcement and scroll into view. Popup space follows the viewport and sticky header, including visual-viewport changes; suggestions overlay the form without moving the document. Its optional visual footer is omitted below 180px of popup space so the choices remain usable. Clear buttons are keyboard-reachable. Existing type/focus/reduced-motion conventions remain. Automated browser/a11y tests are not a full manual screen-reader or physical keyboard-device audit.

## Verification

`tests/locations.spec.ts` separates actual local snapshot/API/browser checks from mocked delayed/failing network scenarios. It covers provenance, bounded responses, airport ranking, Unicode/aliases, duplicate city countries, strict request handling, explicit keyboard selection, composition, route handoff/swap/clear, sector/stay removal focus, derived/manual country state, touch, popup bounds and automated WCAG checks. The complete browser suite also exercises the existing booking/account/admin/hotel/public workflows with isolated backend configuration. Actual run results are recorded in [PROGRESS.md](PROGRESS.md).

The suite does not contact live Supabase, create real bookings, validate supplier inventory, certify real-device Safari/Firefox, measure conversion uplift or deploy the site.
