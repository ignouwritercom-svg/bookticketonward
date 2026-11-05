# Admin operations and website management

Implemented 5 November 2026 for the existing verified staff account. No operator/editor role hierarchy, account grants, hosted migration, payment gateway or deployment is introduced.

## Daily management

The shared admin shell groups navigation into Workspace, Reservations, Website & Business and Monitoring. The active module expands relevant content or business-editor links. Breadcrumbs identify the module/detail/preview without echoing customer IDs; contextual links retain the current editorial collection. A keyboard-searchable section chooser (`Ctrl/Cmd+K`) filters static destinations locally, not customer records. It has arrow-key navigation, explicit Escape dismissal, focus containment/return and no query persistence. Mobile uses a modal drawer with backdrop/Escape dismissal, route closing and desktop-resize cleanup. A native no-JavaScript disclosure supplies navigation while private-record interactions continue to require JavaScript.

The overview separates operational totals, a three-step reservation workflow, the oldest paid queue, actionable exception counts and reservation/website management modules. No sample revenue or invented operational state is shown. Order filters have explicit accessible control labels and a collapsible filter/sort section. This navigation refinement requires no additional migration or environment change; the original CMS setup below still applies.

| Screen | Working controls |
| --- | --- |
| `/admin` | Real order totals, oldest paid preparation queue, pending upload and failed-email alerts, management shortcuts |
| `/admin/orders` | Reference/service/payment/preparation/date filters, newest/oldest sorting, database pagination and individual order workspaces |
| `/admin/orders/[UUID]` | Existing immutable traveller/order details, private staff notes, preparation, private PDF upload/review, explicit publication/withdrawal, manual delivery and audit |
| `/admin/documents` | Cross-order private/published/withdrawn/pending/failed version library, reference filters, protected review downloads and order actions |
| `/admin/customers` | Submitted-order customer directory, bounded account-email search in POST bodies, totals and owner-ID order history |
| `/admin/content` | Existing public pages and FAQs, guide/destination records, publication/draft state and new article creation |
| `/admin/editor/[key]` | Plain-text field/section/FAQ/card/link/source editing, ordering, private draft save, review/publish, withdrawal and revision restore |
| `/admin/editor/[key]/preview` | Independently authorized saved-content preview; no public preview URL or token |
| `/admin/settings` | Homepage/support/working-time settings, price catalog, acceptance policies and boolean configuration availability |
| `/admin/activity` | Paginated order audit and recent website changes, with links to full detail/history |
| `/admin/notifications` | Existing notification attempts, failure review, bounded retry and ambiguous-outcome acknowledgements |

The public header/footer stay shared. Staff has a responsive sidebar/mobile navigation, current-page indicators and a static explanation when private streamed screens cannot be used without JavaScript. Empty/error/loading states do not invent orders, customers, revenue or setup success.

Routine copy/settings changes need no code edit or rebuild after initial setup. Saved revisions remain private until explicit publication. Preview uses the saved revision, not unsaved form values. Restoring creates another draft; it does not roll back public content automatically. The UI preserves unsaved edits on conflicts and warns before leaving. History shows the most recent 30 revisions; older revisions remain in the database. No delete control or destructive cleanup is added.

## One-time setup — manual only

1. Confirm the intended development Supabase project and review the migration change log.
2. Apply only the unapplied **fifth** migration: `supabase/migrations/202611050001_admin_site_management.sql`, after the existing customer, admin documents, hotel reservations and order notifications files. Do not replay any earlier migration.
3. Record the filename/time/result in the existing manual migration tracking process described in [SUPABASE_SETUP.md](SUPABASE_SETUP.md). SQL Editor does not update CLI migration history automatically; do not later replay these files with the CLI without reconciling that history.
4. Set the server flag `SITE_MANAGEMENT_ENABLED=true` for build and runtime, then rebuild/restart. On Coolify, the approved Supabase public configuration must also be available at build time, as with the existing application. Do not place server secrets in any `NEXT_PUBLIC_` variable.
5. Open Settings. An available migration and enabled flag are separate checks. Open each editor, save a draft, preview the content and publish only approved information.

`.env.local` is not modified by this implementation. Its existing URL/key/secret remain local and Git-ignored. `.env.example` adds only the disabled management flag. Missing setup is shown only to authorized staff; public visitors do not get migration/environment instructions. Existing order operations remain available before CMS setup.

## Catalog and accepted-policy consistency

`business.ts` retains seed/default prices, immutable service limits and the shared integer-paise quote calculation. This additive migration introduces an explicitly enabled runtime catalog. When enabled, public fees, the estimator, booking review, server repricing and PostgreSQL order creation all consume the same authoritative private catalog. One-way/return stay equal; multi-city, hotel-per-stay and per-traveller combo discount are editable. Zero/negative/fractional/oversized fees or a non-positive combo are rejected by both schemas and SQL.

Price publication updates both existing private catalog tables in one transaction. No order total is rewritten. Acceptance-policy publication assigns a new version; existing policy snapshots remain unchanged. Order creation reads a narrow pricing/policy-only public catalog RPC **uncached**, treats the browser fee/version as acceptance preconditions and still calls the existing authoritative order RPC. A stale review fails closed and must be reviewed again. This replaces hard-coded-price editing as the routine management workflow once enabled; do not manually change a catalog or disable the flag after publishing different prices/policies.

Public pages use a tagged, shared, public-only cache. Publication expires the tag and page/layout cache; next server requests reload it. Next 16.4 requires at least 30 seconds of client stale time for prerenders, but **300 seconds for the App Shell** used by partial prefetching/development validation. The shared reader uses `stale: 300`, `revalidate: 60`, `expire: 300`. Already-open client views may retain earlier copy for up to five minutes unless refreshed; server order creation never trusts that stale view. Enabled-mode provider failure does not silently fall back to repository seed fees. Existing cached published content may remain visible during revalidation; uncached order repricing fails closed. Disabling management returns repository defaults and may cause order creation to reject drift, so coordinate any rollback deliberately.

New guide/destination slugs do not require a rebuild. Only those two article leaf routes opt out of instant-navigation validation (`instant = false`), allowing their first request to render complete server HTML, including without JavaScript. Existing curated static parameters remain. First visits to newly published articles can wait for the public-content read; the rest of the site retains its rendering/cache configuration. Changes to the displayed booking fee or policy clear both in-memory confirmations; customers must review and save again before creating an order.

Local integration also observed a first post-publication full-route response marked `STALE` while Next regenerated HTML. Refresh a public page shortly if it still displays the previous copy. The browser check polls fresh requests with a bounded timeout rather than assuming a stale loaded document changes automatically. This does not relax uncached order repricing or promise a deployed cache propagation time.

Public service copy uses automatic fee/timing markers where values must follow settings. The editor explains them; saved preview and public rendering resolve them to current published values. Examples: `{{flight_fee}}`, `{{hotel_fee}}`, `{{combo_fee}}`, `{{working_hours}}`, `{{delivery_target}}`. Plain literal figures entered by an editor remain editorial content and need review when fees change. Hard-coded service limits, route templates, canonical domain, navigation geometry, gateway/server infrastructure and credentials remain engineering configuration.

Public legal-page copy is separate from booking acceptance text. An explicit publish acknowledgement is a staff approval step, not legal advice or proof of business registration. Policy/contact drafts keep their noindex state unless the editor explicitly changes it and the existing global indexing gate is enabled. No legal identity, support contact, author, official rule or testimonial is supplied on the owner's behalf.

## Access and data boundaries

- Every staff page/API verifies fresh identity and staff membership; reads recheck membership before rendering/returning data. Existing staff membership and customer authorization are preserved.
- New private record/revision tables have RLS enabled, no client policies and explicit table/helper revocations for PUBLIC, anon and authenticated. Narrow owner-executed RPCs call the existing staff guard, retaining its role-row lock. Schema exposure defaults are not relied on.
- Draft writes use strict bounded same-origin JSON, shared validation, per-record transaction locks and optimistic revisions. Publication checks safe links, useful structure, dates, unique headings/questions/titles and known published link targets. Withdrawals check incoming editorial links. Source correctness and business approval remain a human review responsibility.
- Public RPCs expose only published content, public pricing/policy/settings and publication tombstones. No draft existence, staff actor, revision body, customer, note, Storage path or secret is public. The narrow pre-stream route check distinguishes a withdrawn page from a never-published draft without disclosing the draft.
- New guide/destination routes, canonical metadata, collection cards, related guides and the sitemap use the published collection. Public lookup failure returns unavailable rather than a false 404. Core URLs/layouts stay fixed; there is no arbitrary HTML/JavaScript, upload, redirect or SQL editor in the CMS.
- Customer-directory search is staff-only and uses POST bodies, never email URL parameters/browser storage. Directory rows omit traveller names, DOB and booking/contact snapshots. Individual order records remain authorized independently.
- Document transport still uses the server-only secret only after session/RPC authorization and rechecks after I/O. Publication and external delivery stay separate. Pending confirmation can be retried through the existing guarded `complete` RPC; abandoning calls guarded `abort`, retains history and does not delete private bytes. Neither action confirms payment or publishes automatically.
- No UI/API can mark an order paid, refund money, enable a gateway, grant staff access or change RLS. No bulk customer export, account deletion or unimplemented support-ticket/profile control is presented.

## Test separation

`npm run test:management` applies all five exact migrations in disposable PGlite under a non-superuser owner and hostile default grants. It exercises actual SQL grants/RLS/RPCs, draft privacy, revocation, conflicts/history, publication, immutable order prices/policies and stale-fee/payment denial. It never reads environment files or contacts Supabase.

`npm run test:admin:workspace` builds the real application with child-only loopback settings. Its HTTP bridge translates the subset of SDK REST filters used here into actual disposable PostgreSQL queries/RPCs, with synthetic HMAC Auth sessions and private in-memory Storage byte transport. Browser tests exercise actual Next pages/endpoints, catalog/cache publication, private previews, a new article/sitemap/withdrawal, PDF flows, errors and authorization. This is **not** hosted Supabase or full PostgREST/Storage conformance testing. No application test-auth branch or real paid fixture is installed. Helpers shut down and the disposable database closes afterward; retained reports/captures are not deleted.

Existing `test:admin`, `test:notifications`, empty-provider browser suites, lint, standalone TypeScript and a restored normal production build provide regression coverage. Run outcomes/evidence are in [PROGRESS.md](PROGRESS.md). Live-provider concurrency, actual SMTP delivery, deployed cache behaviour, cross-browser/physical-device and manual screen-reader checks remain separate. No deployment is included.

The initial public snapshot reader is bounded to 200 managed records, including settings and withdrawn publication records. Plan a paginated/per-record content-read change before growing beyond that bound; this is not an unlimited-volume CMS. Built-in navigation/layout templates and infrastructure remain code-owned. The local bridge cannot establish hosted-provider capacity or deployed cache propagation.
