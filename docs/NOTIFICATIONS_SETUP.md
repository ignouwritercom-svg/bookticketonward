# Transactional notifications — Phase 7

Implementation is local. Payment gateway integration and deployment remain on hold. No real email was sent during implementation. Supabase OTP and its dashboard SMTP settings remain independent and unchanged.

## What creates an update

| Business event | Customer activity and email |
| --- | --- |
| Order saved | One `booking_saved` event per committed order, not each draft save. Includes reference, flight/return and hotel city/date summary, amount due and awaiting-payment language. No fulfilment timer starts. |
| Processing started | Existing staff RPC must first accept the paid-order transition. |
| Document publication | Existing paid-order/staff checks, ready PDF and explicit publication required. A combo publication says a document was published, not that every required type is complete. |
| Published document withdrawn | Owner activity and a concise withdrawal notice; an unpublished withdrawal does not notify. Pending ready/replacement emails are cancelled if their document is withdrawn before the worker preflight. |
| Replacement published | Explicit updated-document event when an earlier published version of the same kind was withdrawn. Upload alone never publishes or silently replaces another version. |
| Verified payment | Type/interface only in `src/lib/notifications.ts`. No runtime producer, SQL enqueue event, endpoint or manual paid control exists. A future verified capture processor must atomically persist accepted payment evidence and its event before this can be connected. |

The SQL triggers run inside the existing order/audit transaction. A unique event/owner key and one job per notification prevent duplicate enqueue. There is no historical backfill: old orders and old disabled test accounts do not receive retrospective emails. Database failure before commit rejects the transaction honestly; after commit, email failure never reverses or loses the order. No SMTP request runs inside an order transaction or HTTP response handler.

Account emails go to the **current verified sign-in email**, independently of the preferred document-delivery channel. The booking form and account activity explain this. WhatsApp remains staff click-to-chat with only the reference, followed by explicit manual-delivery recording. Email acceptance does not mark an order delivered. No marketing, PDF attachment, signed download URL, passenger name, DOB, private note or original PDF filename is included in transactional messages. The body uses only the allowed order/route/date/price fields; HTML is escaped.

## Migration order — manual development setup

1. `supabase/migrations/202610220001_customer_bookings.sql`
2. `supabase/migrations/202610220002_admin_documents.sql`
3. `supabase/migrations/202611020001_hotel_reservations.sql`
4. **`supabase/migrations/202611030001_order_notifications.sql` — new for Phase 7**

Review the fourth file and run the entire transaction once in the confirmed development SQL Editor, after confirming the first three are already applied. Do not replay applied migrations or reset the database. No migration was applied remotely by the agent. Record the filename/date in your change log; SQL Editor does not populate CLI migration history. Reconcile actual history before adopting CLI migrations later.

All four new tables enable RLS. `public.order_notifications` has explicit authenticated SELECT with owner-only RLS; read state changes use a narrow ownership-checked RPC. Customers cannot insert events, change recipients, update arbitrary columns or access the outbox. The three `booking_private` tables have no customer policies or table grants. Staff sees a sanitized paginated log through `require_staff()`-protected RPCs, with fresh role checks. Explicit grants work with “Automatically expose new tables” disabled. No existing order/document/Storage RLS or payment restriction is loosened.

## Restricted worker database identity

The migration creates `booking_notification_worker` as a **NOLOGIN**, non-superuser, non-BYPASSRLS role. It has schema usage and execute on exactly three private functions: `notification_claim`, `notification_payload`, `notification_finish`. It has no general order-table access, enqueue privilege, staff privilege or payment mutation.

A database administrator must provision a separate LOGIN role with a strong locally supplied password, no superuser/BYPASSRLS/CREATEDB/CREATEROLE privileges, and membership in `booking_notification_worker`. Do this through the confirmed development database administration workflow; do not put a real password in source or chat. An example role name is `dummy_notification_runner`. Grant only membership:

```sql
-- After the administrator creates the dedicated login with secure password handling:
grant booking_notification_worker to dummy_notification_runner;
```

Use the connection settings supported by your Supabase direct/pooler endpoint for this dedicated identity. URL-encode reserved characters in the connection password locally. The worker executes `SET ROLE booking_notification_worker` after connecting. It rejects superuser/BYPASSRLS login identities. **Do not reuse `SUPABASE_DB_URL`, the postgres owner, the Auth service/Secret Key or a public/publishable key.** The document Secret Key remains Storage-only; notification code does not consume it.

Database TLS verifies certificates and hostnames. Set a trusted CA file if required by the endpoint. Do not disable certificate verification. The connection URL must not contain `sslmode`, `sslcert`, `sslkey` or `sslrootcert`; the worker supplies the verified TLS configuration explicitly. See [node-postgres SSL configuration](https://node-postgres.com/features/ssl).

## Root `.env.local` settings

Copy only the new placeholders from `.env.example` and replace them locally, preserving existing values. `.env.local` remains Git-ignored. None of these variables may use `NEXT_PUBLIC_`.

| Variable | Purpose |
| --- | --- |
| `NOTIFICATIONS_DATABASE_URL` | Dedicated restricted worker PostgreSQL connection string |
| `NOTIFICATIONS_DATABASE_CA_FILE` | Optional trusted database CA PEM path; leave empty when system trust works |
| `NOTIFICATIONS_APP_ORIGIN` | Approved origin for authenticated order links; local `http://localhost:3000` in development, HTTPS in production |
| `NOTIFICATIONS_TRANSPORT` | `capture` by default; `smtp` only for an explicitly approved test |
| `NOTIFICATIONS_SMTP_MODE` | `controlled` by default; production `live` requires additional gates |
| `NOTIFICATIONS_TEST_RECIPIENT` | Exact controlled email supplied by the owner; never reroutes another customer's email to this address |
| `NOTIFICATIONS_LIVE_DELIVERY_ENABLED` | Defaults false. Live mode additionally requires `NODE_ENV=production` and HTTPS |
| `NOTIFICATIONS_SMTP_HOST` | Temporary development provider: `smtp.gmail.com`; replaceable |
| `NOTIFICATIONS_SMTP_PORT` | 465 (implicit TLS) or 587 (required STARTTLS) |
| `NOTIFICATIONS_SMTP_USER` | Development SMTP account |
| `NOTIFICATIONS_SMTP_PASSWORD` | Gmail App Password or future provider's SMTP credential |
| `NOTIFICATIONS_SMTP_FROM` | Approved sender mailbox supported by the provider |

Gmail development setup requires an eligible account, two-step verification and an App Password (or a future OAuth adapter). Do not use the ordinary Google login password. Gmail can impose quotas, sender restrictions and account-security blocks; it is a temporary development provider, not a launch deliverability guarantee. Supabase dashboard SMTP is **not automatically available to this app**. Reference: [Nodemailer Gmail setup](https://nodemailer.com/guides/using-gmail), [SMTP transport and TLS](https://nodemailer.com/smtp).

The server transport interface lives in `scripts/notifications/transport.mjs`; the Next.js client imports none of its configuration, Node modules or credentials. Its adapter returns bounded outcome codes, never raw SMTP errors or credentials. Provider changes do not alter business triggers or customer authentication. Messages disable file/URL attachment access and use bounded connection/socket/overall timeouts.

## Local worker commands

```text
npm run test:notifications
npm run notifications:worker
npm run notifications:worker -- --watch
```

`test:notifications` needs no credentials: it creates an isolated in-memory PostgreSQL database, synthetic Auth/Storage records and local MIME capture files. It does not load `.env.local`, contact Supabase or send SMTP. Evidence is written to a unique `test-results/notifications-<uuid>/` directory.

The worker command loads `.env.local`. Without `--watch`, it drains at most 100 currently due jobs and exits; with `--watch`, it polls every five seconds until stopped. The transport defaults to local capture and claims **only `.test` recipients**. Captures go to a unique `test-results/notifications-capture-<uuid>/` directory and finish as `captured`, never `sent`. They are not eligible for a staff resend; create a new controlled test order when testing SMTP later. Real recipients require explicitly configured `smtp` mode. Starting the worker is an operator action; it is not started automatically by `npm run dev` or any API endpoint.

## Reliability and retry semantics

- Claims use a single transaction with `FOR UPDATE SKIP LOCKED`; one job at a time per worker, a unique claim token and a five-minute lease. Completion checks both token and active lease. One process can send while another claims a different job.
- At most five automatic attempts, with 30/60/120/240-second backoff (bounded at one hour). Automatic retries apply only to clearly pre-delivery connection failures. Auth/rejection/unknown outcomes require staff review.
- A crash, lost connection or expired lease after SMTP may have accepted the email becomes `failed` with `ambiguous_delivery`. It is **not automatically resent**. The worker sweep records this outcome in attempt history. The protected log identifies sending jobs and lease timing while recovery is pending.
- Staff retries lock the job, require `failed`, reject sent/captured/sending/queued jobs, and record a unique request ID, actor and duplicate-risk acknowledgment. Network replay of the same retry request is idempotent. At most ten lifetime attempts; each manual retry permits only one extra attempt once the automatic limit is exhausted.
- Ambiguous retries require explicit acknowledgment and a ten-minute review interval. This reduces accidental duplicates, but SMTP cannot guarantee exactly-once delivery after an ambiguous failure. A stable Message-ID is diagnostic, **not** a provider deduplication guarantee. Investigate provider records before approving another attempt.
- `sent` means SMTP accepted the message; inbox delivery/read state remains unknown. `read_at` refers only to a customer's explicit account action and is unrelated to SMTP.
- The worker rechecks current verified/unbanned recipient, payment eligibility and published/non-withdrawn document state before sending. Stale document messages are cancelled. A withdrawal racing external email delivery cannot recall an accepted email; messages describe dated historical events and link only to the freshly authenticated account. The document endpoint independently prevents withdrawn downloads.
- Sanitized status/error codes and attempt timestamps appear in `/admin/notifications`. Admin overview links to failures and to paid/not-started orders; unpaid orders are never fulfilment tasks. Customer activity is available in orders and `/account/notifications`.

## Controlled SMTP procedure — pending owner recipient

1. Keep capture mode while running isolated tests. Do not use real customers or retained old test accounts.
2. After the owner explicitly supplies a controlled recipient, create a fresh uniquely labelled development account/order for that recipient through the existing verified flow. Leave payment awaiting payment.
3. Configure the dedicated worker connection and Gmail settings locally, `NOTIFICATIONS_TRANSPORT=smtp`, `NOTIFICATIONS_SMTP_MODE=controlled`, and that exact `NOTIFICATIONS_TEST_RECIPIENT`. Keep live delivery false. Only matching verified recipients can be claimed; messages are never redirected from another account.
4. Run the bounded worker once. Inspect the protected log and the controlled inbox. Report SMTP acceptance separately from actual inbox receipt; retain sanitized run evidence and redact credentials.
5. Test failure/retry cases with synthetic fixtures. Paid transitions/document cases must use an isolated local database, or separately authorized synthetic development fixtures; never mark a genuine customer paid or add a payment bypass.
6. Stop the worker and return to capture mode. Review dependencies before changing retained test records. Do not delete shared test directories or unrelated records.

## Production prerequisites and limits

Deploying Next.js alone does not run this queue. Provision a supervised durable worker or scheduled Node process with outbound TLS/SMTP and verified PostgreSQL access, least-privilege secrets, graceful shutdown and monitoring. Monitor oldest queued job, expired leases, failed counts and backlog; this phase provides in-app alerts, not an external pager. A stopped worker cannot report its own failure by email.

Before launch: select the domain email provider, approve sender/business contacts and notification copy, configure and verify SPF/DKIM/DMARC with the chosen provider, define retention and account-deletion handling, set quotas/rate controls appropriate to traffic, and complete live two-session concurrency/revocation and controlled inbox tests. No bounce/complaint webhook, read tracking, distributed rate limiter or production scheduler is implemented. Gmail is not approved as the final provider.

Existing orders/users are referenced by notification and audit records; no automatic retention deletion is included. Retention and erasure require a reviewed dependency-aware procedure. Test runners now use unique browser run directories, preserving existing reports. Local PGlite tests validate SQL/RLS/lease fencing and competing claims in an embedded single-session engine; they do not establish real multi-session PostgreSQL locking or actual Supabase/SMTP network behavior. The Next.js private routes remain authenticated, no-store and noindex independently of robots.

Payment gateway, final policies/contact approval, real-device checks from Phase 6 and deployment remain separate launch work. No live payment integration, automatic WhatsApp service or real SMTP integration was performed in this phase.
