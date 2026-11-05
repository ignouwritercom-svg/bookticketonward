# Brand, service, help and policy page review

Reviewed 5 November 2026. Repository implementation only; no deployment or remote mutation.

## Research and interpretation

The following primary public pages were read for information architecture and presentation ideas. This is a qualitative reference review, not a market-wide survey, independent verification of competitor claims or evidence of conversion performance. No text, identity, credentials, refund entitlement, contact detail or customer-review claim was copied into our site.

| Reference | Observed pattern | Application here |
| --- | --- | --- |
| [Wise: our story](https://wise.com/gb/about/our-story) | Mission and purpose are a distinct narrative, separate from product instructions | Dedicated `/about` page with our actual service focus, approach, product choices and information handling; no invented founder story or milestones |
| [Wise Help Centre](https://wise.com/help/) | Topics and returning-account access provide different help paths | Contact page starts with an account action and six task-based links, followed by relevant explanations |
| [Airbnb: find a cancellation policy](https://www.airbnb.com/help/article/149) | Guidance distinguishes checking before booking from reviewing a confirmed reservation, with in-page navigation | Refund page first identifies draft, unpaid order or existing document; policies share tabs, contents and readable chapters |
| [Dummy-Tickets.com: about](https://dummy-tickets.com/about-us) | Service scope and an action are visible on the brand page | Explain flight, hotel and combo document services and link directly to their existing flows; do not borrow competitor history, ratings or affiliations |
| [DummyTicket.com: terms](https://www.dummyticket.com/terms-and-conditions/) | Payment, cancellation and refund stages are separated | Distinguish request, payment and document stages using our actual implementation; competitor eligibility rules and deadlines are not our policies |

## Implemented page families

- **About:** new indexed-when-approved `/about` URL; large brand introduction, illustrative flight/hotel folio, purpose statement, principles and service cards, account/data explanation and related service action. Content is grounded in existing functionality rather than invented company history.
- **Services:** existing `/dummy-ticket` canonical retained; product hero/folio, shared-quote starting-fee strip, three service-selection cards and full service/preparation guidance. No duplicate `/service` or `/services` content route.
- **Contact:** account-led help hub, six useful task links, detailed troubleshooting and bounded navigation. Direct channels remain accurately unavailable until approved contacts are supplied. No nonfunctional form, fake agent, invented response time or fake live-chat status.
- **Terms / privacy / refunds:** restrained policy hero, reference panel, active cross-policy tabs, visible provisional notice, short practical summary and numbered reading chapters. Refunds start with a request-stage guide; privacy starts with an information-flow summary. Provisional/noindex status is preserved.
- **FAQ / process:** separate reading-roadmap heroes; answer bank before related explanatory content on FAQ, and a visible stage progression for the first five process sections. Existing native disclosures, exact section anchors and booking actions remain.

Other public articles retain the previous editorial system, avoiding an unrelated rewrite of working guide/destination/pricing/sample components. The shared header/footer and private workspaces are preserved. The new About link is in the common footer, so it is reachable from every existing page.

## Technical boundaries

`PublicContent.presentation` selects the family. `BrandPage` composes original structured sections through the existing `ArticleSection` renderer. The current title/description/date/related-link registries still drive metadata and the sitemap; AboutPage and ContactPage JSON-LD match their visible content. Layouts are server rendered with inline icon/CSS artwork; no new client component, font, raster dependency or tracking.

All new styling is scoped to the brand/studio selectors. Policy copy still describes the actual unpaid-order workflow and does not set new refund rights, legal jurisdiction, identity, retention periods or paid-service guarantees. Authoritative accepted-policy snapshots, business prices, authentication, order ownership/staff checks, payment verification and private Storage restrictions are unchanged. No credentials, migration, database write, real message or deployment is included.

Validation results, failures found and retained visual evidence are recorded in [PROGRESS.md](PROGRESS.md). Automated checks do not replace business policy approval, physical-device review, field performance or conversion measurement.
