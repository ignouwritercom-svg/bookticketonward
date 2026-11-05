# Phase 4 — staff orders and private documents

**Admin entry:** open `/admin-login` directly (production: `https://dummyticketonward.com/admin-login`). It is intentionally absent from public navigation. Use the existing verified admin email and emailed OTP; no new password, registration, migration or role grant is needed. `/login` is the customer entry. Existing active staff authorization is still checked on every protected operation. Both entry screens share the same Supabase identity session in a browser; use separate browser profiles if working as a customer and administrator simultaneously.

**Managed-workspace addition:** after the four existing migrations, persistent website editing/customer-directory features use a fifth additive migration and a server enable flag. Follow [ADMIN_WORKSPACE.md](ADMIN_WORKSPACE.md). Existing staff accounts and payment/document restrictions remain; no migration runs automatically.

**Phase 7 addition:** transactional account updates and the protected notification log use a fourth additive migration and a separate restricted Node worker. Follow [NOTIFICATIONS_SETUP.md](NOTIFICATIONS_SETUP.md) after the three foundation migrations below. Document email/WhatsApp delivery remains a distinct manual staff action. The existing `test:admin` suite verifies the three foundation migrations; `test:notifications` applies all four and verifies notification RLS, triggers, leases and retries.

**Hotel/combo extension:** the execution order below includes all three migrations required by the current application. [HOTEL_SETUP.md](HOTEL_SETUP.md) explains approved pricing and document-type requirements. The first two migration files were left unchanged by this extension. `test:admin` applies all three migrations.

Implemented locally; the customer confirms development OTP, saved bookings, order history and admin login. On 3 November 2026 the agent also verified the six document scenarios against actual development Auth/PostgreSQL/Storage through local application endpoints using newly created synthetic fixtures. No genuine customer payment, existing staff grant, migration, security policy or deployment was changed. See the integration results below.

## 1. Apply the unapplied migrations manually

Execution order:

1. `supabase/migrations/202610220001_customer_bookings.sql` — already applied; **do not edit or rerun**.
2. `supabase/migrations/202610220002_admin_documents.sql` — the only new migration for Phase 4.
3. `supabase/migrations/202611020001_hotel_reservations.sql` — required by the current Dummy Flight Ticket / Dummy Hotel Booking / Dummy Flight + Hotel Combo application, including document types and admin actions.

Confirm your development project in the Supabase dashboard and check your migration change log. If only the customer migration has been applied, open the **second file**, copy its entire contents into a fresh SQL Editor query, and run it once. Then run the **third file** in a separate query. Skip any migration already successfully applied; do not rerun it. The Phase-four transaction adds staff/document/audit tables, explicit authenticated SELECT/EXECUTE grants, RLS, staff-only order reads and narrowly authorized mutations. All new data tables enable RLS. Existing customer owner policies and the catalog restrictions remain. It expands allowed payment/status values but does not mark any order paid. There is no payment confirmation RPC.

The migration also creates the private bucket described below. If any statement fails, the transaction rolls back: fix the stated issue before retrying. Do not run only selected fragments. Do not silently reuse an existing bucket with the same name; inspect a conflict first.

Record the filename and date in your development change log. As with Phase 3, SQL Editor does **not** populate Supabase CLI migration history. Do not fabricate history entries or replay the initial migration. If adopting the CLI later, reconcile its history with the migrations actually applied to the confirmed target.

## 2. Private bucket and server configuration

The new migration creates `order-documents` with:

- Public access **off**.
- Maximum file size **10,485,760 bytes (10 MiB)**.
- Allowed MIME type `application/pdf`.
- Restrictive Storage policies denying this bucket's direct access to `anon` and `authenticated`, even if another broad permissive policy exists. Other buckets are not opened or changed by these policies.

Do not make this bucket public or add client upload/download policies. Staff also go through the server, so they cannot skip PDF validation using the public Storage API.

Add this **new server-only variable** to root `.env.local`, retaining your existing URL, publishable key, OTP length and all other settings:

```dotenv
SUPABASE_SECRET_KEY=PASTE_YOUR_DEVELOPMENT_SUPABASE_SECRET_KEY_HERE
```

Get the development project's secret API key (`sb_secret_` format) from its API key settings. Never use a `NEXT_PUBLIC_` prefix for it; never paste it into chat, source code, browser settings, screenshots or logs. The agent left `.env.local` unchanged. `.env.example` contains only the placeholder. Restart `npm run dev` after adding the secret; rebuild before running production locally.

The secret client lives in `src/lib/document-storage.ts`, marked `server-only`, and is used only as Storage transport. All identity, staff authorization, order reads and document authorization use the ordinary session client and database functions. Secret/service keys bypass Storage RLS, which is why every transport call requires prior session/RPC authorization. See [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) and [API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Admin lists and notes work without the secret, but uploads/downloads report unavailable. This additional variable does not change the customer sign-in availability guard.

## 3. Grant the first admin to an existing verified user

Sign in normally with that user's email OTP first. In Supabase Authentication → Users, copy the **immutable user UUID**, checking the account carefully. Never identify the grant only by an email string or user-editable metadata. Run the following manually in the confirmed development SQL Editor after replacing the UUID placeholder:

```sql
do $$
declare target uuid := 'REPLACE_WITH_VERIFIED_USER_UUID'::uuid;
begin
  if not exists (
    select 1 from auth.users
    where id=target and email_confirmed_at is not null and not is_anonymous
  ) then
    raise exception 'Existing verified user required';
  end if;
  insert into booking_private.staff_roles(user_id)
  values(target)
  on conflict(user_id) do update set revoked_at=null, granted_at=now();
end $$;
```

There is no public role-assignment endpoint and no automatic first-signup promotion. Neither ordinary customers nor application staff have table privileges to assign roles. Keep role changes in your administrator change log.

To revoke access manually:

```sql
update booking_private.staff_roles
set revoked_at=now()
where user_id='REPLACE_WITH_USER_UUID'::uuid;
```

The application checks the database role on each operation, rather than trusting a role embedded in an old JWT. Mutations hold a shared lock on the active role row during their transaction; revocation serializes against already-running mutations. A previously completed response/download cannot be recalled, but future reads, mutations and downloads are denied. Refresh any open staff tab after revoking access.

## 4. Open and use the staff desk

1. Start `npm run dev`; open `http://localhost:3000/admin`.
2. Sign in through the existing OTP flow using the manually assigned staff account. Unassigned accounts see Staff access required.
3. Overview shows real counts; Orders supports reference-prefix search, payment/fulfilment filters, IST creation-date range and 20 orders per page.
4. Open an order to inspect its snapshot, contact preferences, notes, versions and audit history. Contact links only open a compose window; they do not send or attach a document. Business contact settings are still unset, so choose an approved business messaging account yourself.
5. Real orders currently remain awaiting payment. Notes/contact review work; processing, upload, publication and delivery are blocked until a future verified payment integration establishes payment. **Do not alter genuine customer payment records to try fulfilment.**
6. On an isolated paid fixture the workflow is Start processing → Upload private PDF → Publish selected version → manually send it using your approved channel → explicitly Confirm manual delivery. Upload does not publish or mark Delivered. Publication is a separate dashboard event; external delivery has its own event, actor and timestamp.
7. Withdrawal blocks future customer downloads; staff retains review access and version history. Withdrawn versions cannot be republished: upload a corrected new version. Uploading a new version never overwrites or silently withdraws older published versions; withdraw obsolete versions explicitly.

## 5. Downloads and failure handling

Customers see only their paid order's ready, published, non-withdrawn documents. `GET /api/documents/[documentId]` verifies the fresh authenticated identity and database authorization, fetches bytes privately, and checks authorization again after Storage I/O. It returns an attachment with no-store/nosniff headers. No permanent public URL or reusable signed URL is exposed. A new HTTP request is needed for every download; unrelated customers receive the same unavailable response.

PDFs are capped while streaming the request body, then checked for extension, MIME type, size, `%PDF` version header and EOF marker. Files use UUID object names, not passenger names or original filenames. These envelope checks are not a malware scan or verification of reservation contents; staff must review the supplied PDF.

Uploads reserve a version under an order lock, upload to its unique object key, and finalize only if matching Storage metadata exists. Pending/failed versions never appear to customers. A failed upload attempts to mark the reservation failed before deleting its unique object. If confirmation is ambiguous, the server leaves the object private: deleting it could break a transaction that committed before a network response was lost.

The UI surfaces pending versions instead of claiming success. For a pending/failed version:

1. Refresh the order to check whether it became ready. Do not publish or delete a ready version as part of upload cleanup.
2. A trusted administrator should inspect that exact order/document UUID and object in the private Storage dashboard. No customer can retrieve a pending or failed version.
3. After ensuring no upload request is still running, mark a confirmed stale pending row failed through this controlled SQL (replace only the immutable document UUID):

```sql
update public.order_documents
set state='failed'
where id='REPLACE_WITH_DOCUMENT_UUID'::uuid and state='pending';
```

4. If the row is now failed, remove only its associated object through the Storage dashboard/API, not by deleting `storage.objects` SQL rows. Record the operational cleanup in the administrator change log. Never remove ready objects, which may be referenced by a published version.
5. Upload the source PDF again as a new version through the validated application endpoint. Version gaps are intentional; history is preserved. There is no automatic cleanup job yet.

## 6. Local verification without payments

Run:

```text
npm run lint
npm run typecheck
npm run build
npm run test:database
npm run test:admin
npm run test:browser
```

`test:database` runs the original migration/RLS/transaction suite in PGlite. `test:admin` applies all three exact migrations to a disposable in-memory PostgreSQL database with synthetic Auth and Storage metadata. Only this isolated database gets synthetic paid fixtures. It tests roles/revocation, note/audit privacy, unpaid restrictions, object permissions, publication/download authorization, versions, failed uploads and PDF checks. It never reads `.env.local` or contacts Supabase; it does not reproduce actual Storage byte transport or concurrent network transactions.

`test:browser` now builds and runs its temporary port-3100 server with empty Supabase/secret configuration **only in child-process environment overrides**. This keeps the existing missing-configuration and mocked OTP tests independent of working development credentials. No `.env` file is modified. Browser tests include denied admin/document endpoints, cache/CSRF boundaries, synthetic document rendering, accessibility and existing customer flow regressions. Synthetic rendering is not a successful live login or storage authorization test.

The test runner leaves an unconfigured production build in `.next`; run `npm run build` again with normal configuration before `npm run start`. Your `npm run dev` uses its separate dev build and retains the working `.env.local`.

## 7. Actual development integration and remaining checks

Run `4d554701-fe9a-44b4-82d1-d0ed72097b34` passed authenticated staff PDF upload/publication, paid-owner byte-for-byte download, cross-customer denial, withdrawal denial and unpaid publication denial against the hosted development services through the running local app. It also verified unpublished/anonymous denial, direct staff Storage denial, private response headers, audit attribution and role revocation. These are actual integration results, separate from the isolated PGlite and mocked browser suites.

Three synthetic users and orders `DT-TEST-4D554701-PAID` / `DT-TEST-4D554701-UNPAID` were created solely for this test. Only the new paid fixture was seeded paid using the dedicated development database connection, scoped by UUID, owner and run marker. All test rows and the withdrawn private PDF were retained; synthetic staff access was revoked, sessions signed out and all three synthetic accounts disabled. The test orders remain visible in development counts. No destructive SQL ran. Report: `test-results/live-documents-4d554701-fe9a-44b4-82d1-d0ed72097b34.json`.

The following remains a broader verification checklist. Basic document success/denial and post-revocation checks above are complete; concurrency, mid-request revocation, upload/network failure recovery and OTP session-expiry cases still require dedicated integration checks:

- Verify migration/table grants and RLS in the identified development project, private bucket limits/policies and PostgREST schema refresh.
- Confirm a verified staff account can read real orders while an ordinary customer cannot access admin pages, grant a role, read notes/audit or mutate statuses through direct REST/RPC calls.
- Confirm an anonymous client cannot use any admin/document operation.
- Revoke staff while its browser remains signed in; verify the next request and direct RPC lose access.
- Keep all genuine unpaid orders unchanged and confirm fulfilment remains blocked.
- For hosted Storage end-to-end testing, use a **separate disposable local Supabase instance** with synthetic Auth/orders and an explicitly labelled paid fixture, or wait for verified gateway payment. No paid-fixture seed or payment bypass exists in the app or deployable migrations.
- In that isolated integration environment, upload a valid PDF, test invalid MIME/signature/oversize input, simulate upload/finalization failure, publish it and download as owner. Confirm a second customer, anonymous user, unpublished version and withdrawn version are denied. Verify raw Storage access is denied even to authenticated staff, and bytes download correctly via the app.
- Check real OTP/session expiry, Storage metadata shape, revoked access during upload/download and concurrent uploads/version numbering. PGlite tests do not establish these hosted behaviors.

Payments and deployment remain out of scope.
