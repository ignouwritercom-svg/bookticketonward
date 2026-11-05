# Customer workspace

Implemented 5 November 2026. This expands customer account functionality around the existing saved-draft, order, document and notification systems. It does not introduce a gateway, payment confirmation, live travel inventory or new database schema.

## Screens and working features

| Route | Purpose and actions |
| --- | --- |
| `/account` | Owner-scoped order/draft/preparation/published-PDF counts, awaiting-payment/unread totals, recent orders, draft resume links, service-specific new requests and account activity |
| `/account/orders` | Order-reference prefix search, service/payment/preparation filters, newest/oldest sorting, twelve-item pagination, reset/refresh/retry and order-detail links |
| `/account/drafts` | Separate draft library, service filter including legacy flight drafts, sort/pagination and existing authenticated resume flow |
| `/account/documents` | Owner's currently published, ready, non-withdrawn PDFs from paid orders; reference/service filters, sorting, versions, publication dates, file sizes and existing protected download links |
| `/account/orders/[orderId]` | Existing immutable order snapshot, payment/fulfilment facts and available documents, with a current-stage progress list |
| `/account/notifications` | Existing owner activity and explicit mark-as-read operation inside the shared customer workspace |
| `/account/settings` | Verified sign-in email, per-booking contact guidance, privacy information and sign-out; no unsupported email/profile mutation |
| `/account/help` | Concrete draft/order/document/account troubleshooting and links to the relevant section and existing help/FAQ pages |

The common site header/footer remain shared with the public website. Account navigation uses a desktop sidebar and mobile grid with an active-page indicator. Main H1s use Title Case. The overview puts actual account totals before the guidance panel. Account styling is scoped to the customer workspace; login, booking and staff layouts retain their existing design. Enlarged-text findings also prompted shared brand/header/footer wrapping corrections, preserving the mobile menu's touch target and available viewport height.

Initial account data is fetched on the server after fresh authentication. Lists provide loading/error/empty states; a failed or expired-session lookup hides previous rows. Retry repeats the failed filter/page request, rather than silently reverting to the last successful filters. A 401 offers a safe return link to sign in again. The first page's data is server-rendered, but private streamed account screens and their actions require JavaScript to become visible/interactive. A static no-JavaScript notice explains that requirement and links to public help; public content and native shared navigation remain available. Do not claim full no-JavaScript private-account functionality.

## Read architecture and access control

`src/lib/workspace-server.ts` uses only the existing session-scoped Supabase client. Every order/draft/notification query has an explicit `owner_id` filter. Document queries inner-join orders and explicitly constrain owner, paid payment status, ready state, non-null publication and null withdrawal. Returned document rows additionally check their parent owner/payment on the server, including when the signed-in account also has staff privileges. Existing database RLS remains independent protection.

`POST /api/account/workspace` re-verifies the customer on every request, accepts bounded same-origin JSON through the existing body reader, and validates a strict shared Zod schema. It accepts only view/page/service/status/reference/sort. Caller identity, payment mutation and arbitrary filter/operator injection are rejected. No reference/passenger/contact values are placed in filter URLs. Responses retain private/no-store/noindex headers and the private-route proxy protections.

The API returns minimal summaries: order ID/reference, service, route or city, travel date, traveller count, fee/status and timestamps. It does not return passenger names, DOB, contact details, full booking snapshots, Storage object paths or private staff fields. Complete own-order details continue through the existing authenticated detail route. Nothing is written to browser storage, analytics or logs.

Lists are paginated in the database with a stable date/ID ordering, an exact filtered count and a twelve-row limit. Out-of-range pages clamp once to the last available page. Dashboard count failures display unavailable values rather than fabricated zeroes; recent-list failures do not appear as empty accounts. Status/read updates occur on navigation, refresh or explicit action; there is no realtime-subscription or background-polling claim.

Query syntax was checked against the primary [Supabase join/filter documentation](https://supabase.com/docs/guides/database/joins-and-nesting) and [PostgREST filter/JSON operator documentation](https://docs.postgrest.org/en/v12/references/api/tables_views.html). The document parent filter uses an inner relationship so unmatched parent orders cannot leave document rows in a response. Legacy draft service filtering is a constant JSON-field OR expression; reference text is separately constrained and cannot inject operators. These documentation checks do not replace live-project integration verification.

PDF links use the existing `/api/documents/[documentId]` transport. Its independent session/RPC authorization, paid/ownership/publication checks, private Storage I/O and post-I/O authorization are unchanged. The workspace does not create signed public URLs or download with a browser secret. Withdrawn/unpaid/foreign documents are not made accessible by a library link or historic notification.

## Order and business boundaries

Payment and fulfilment remain separate. The progress list derives only from persisted payment/fulfilment facts and invents no stage timestamps. “Prepared” is not a promise that a file is published; current published PDFs are shown separately. Unpaid orders do not progress into preparation. Customers cannot mark payments, publish documents, change accepted orders, cancel them or request an automatic refund through invented controls.

Draft edits still use the original RHF/Zod and authenticated RPC flow. Resuming a draft opens review and requires confirmations again. Submitted snapshots are not rewritten. Policy/fee versions, order idempotency and email reconciliation remain unchanged. Contact preferences are per booking; this change adds no passport scan/number, postal address, saved traveller profile, support-ticket backend, unapproved support contact or payment/refund implementation.

No migration, grant, RLS change or hosted operation is needed for the workspace. Existing migrations, including the notifications migration, must already be configured. No secret key is used by account list/count reads.

## Verification and limits

- `npm run lint`, `npm run typecheck`, `npm run build`: normal required checks.
- `npm run test:browser -- --seo-indexable`: existing isolated empty-provider browser regression, with new schema/unauthenticated-route/API checks. Signed-in provider scenarios are skipped here by design.
- `npm run test:workspace`: separate production build against a loopback-only synthetic Auth/PostgREST adapter and synthetic browser cookies. Runs real Next.js routes, SDK requests and customer interactions against those fixtures. It tests account counts, owner filters, reference/service/status filters, pagination/sort, summary minimisation, draft resume, version visibility, two customers, retry/session loss, notification read/focus, layouts, automated WCAG and no-JavaScript messaging. There is no fake-auth branch in application code; only the child test process's provider settings change. `.env.local` is never edited. Restore a normal build afterward.
- `npm run test:admin`: existing isolated PGlite checks exercise actual migration/RLS/document/payment rules using synthetic Auth/Storage metadata. These are distinct from browser provider stubs.

The loopback adapter is not a full PostgREST implementation or live Supabase integration. It rejects unscoped reads but does not replace PostgreSQL RLS verification. No Storage transfer, real OTP email, live payment, live customer record or hosted integration was exercised for this work. Actual run outcomes and evidence are in [PROGRESS.md](PROGRESS.md). Cross-browser/physical-device/manual screen-reader and deployed-provider verification remain separate checks. No deployment is included.
