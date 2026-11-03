# Supabase setup — Phase 3

**Current handoff:** the customer has confirmed development OTP and persistent order history work and the corrected initial migration is applied. Do not rerun it. For the additive Phase 4 migration, first-admin grant and server-only private Storage configuration, follow [ADMIN_SETUP.md](ADMIN_SETUP.md). The original Phase 3 implementation notes below are historical; Phase 4 hosted checks remain pending.

No Supabase target was configured during implementation. No hosted migration or real OTP test has been performed. Until setup is complete, account pages show **Account services are unavailable**. Public content and the unsaved booking form still work.

## 1. Development project and environment

Choose a dedicated **development** Supabase project. Confirm its name and reference before running SQL. Never apply this migration to production or an unknown target. Copy the project URL and **publishable key** from its Connect/API settings into `.env.local` (ignored by Git):

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-DEVELOPMENT-REFERENCE.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-DEVELOPMENT-PUBLISHABLE-KEY
NEXT_PUBLIC_SUPABASE_OTP_LENGTH=6
```

Use `.env.example` as the template. Restart dev or rebuild production after changing public variables. The site URL documents the intended origin; API mutations validate against the actual same-origin request. No service-role/secret key, payment key or SMTP credential is needed in the Next.js app. Never print or commit credentials.

## 2. Apply the migration once

File: `supabase/migrations/202610220001_customer_bookings.sql`.

The initial SQL Editor run was cancelled before execution. The local initial migration now also enables RLS on `booking_private.catalog`, without any client-access policies. Reopen this file and copy its **entire updated contents** into a fresh SQL Editor query; do not use the stale query that prompted **Run without RLS**. Use the corrected migration. No remote SQL has been executed by the agent. If this version has already been successfully applied elsewhere, do not rerun it there; use a new follow-up migration for that environment.

1. Open the confirmed development project's **SQL Editor**, then a new query.
2. Copy the entire migration into it. Confirm the project name/reference again, then run once. The migration is transactional: errors roll it back.
3. Verify the five customer tables and RLS below. Record the filename/date in your development change log.
4. Do not rerun the initial migration after success. Changes need a new numbered migration. SQL Editor execution does not populate CLI migration history; reconcile that history if moving to CLI later.

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in
 ('booking_drafts','orders','order_sectors','order_passengers','order_contacts');
select tablename, policyname, roles, cmd from pg_policies
where schemaname = 'public' and tablename in
 ('booking_drafts','orders','order_sectors','order_passengers','order_contacts');
```

SQL Editor normally uses an elevated role; viewing rows there does **not** verify customer RLS. No migration was applied to a remote/local Supabase project during implementation. The isolated automated database test described below uses an in-memory database only.

### Catalog RLS warning and privilege review

The catalog is intentionally private. The original migration revoked all schema privileges (including USAGE/CREATE) and all private table, sequence and helper-function privileges from `PUBLIC`, `anon` and `authenticated` in one transaction. `PUBLIC` means every role, not the schema named `public`. Those ACL restrictions blocked direct customer access even before catalog RLS was added; the missing-RLS warning was not evidence that catalog data was accessible.

The revised migration adds `ALTER TABLE booking_private.catalog ENABLE ROW LEVEL SECURITY` immediately after table creation. No catalog policy grants client access: non-owner roles default to denial. Existing REVOKEs remain. There is deliberately no FORCE RLS: the trusted migration role owns both catalog and RPCs, so owner execution can read it. This preserves the existing security model while adding protection against accidental future table grants.

`create_booking_order` is the only RPC that reads the catalog; it runs as its function owner via SECURITY DEFINER, not with the caller's ordinary table privileges. It returns an order UUID, validates session ownership/email and checks trusted catalog prices/policy. `save_booking_draft` also uses SECURITY DEFINER but does not read the catalog. Only `authenticated` receives EXECUTE on these two RPCs. The private `customer_email` helper runs as its owner; the private validators use their caller's execution role inside the owner-executed RPC. All helpers are blocked from direct client execution, and all function search paths are empty. SQL Editor's normal `postgres` execution owns newly created objects; the migration itself does not hardcode a replacement owner.

After applying the corrected migration, you may run these **read-only checks manually** to inspect your actual project. The agent has only inspected the source and an isolated local database, not your live roles or ACLs:

```sql
select role_name,
  has_schema_privilege(role_name, 'booking_private', 'USAGE') as schema_usage,
  has_schema_privilege(role_name, 'booking_private', 'CREATE') as schema_create,
  has_table_privilege(role_name, 'booking_private.catalog',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as any_catalog_privilege,
  has_function_privilege(role_name,
    'public.create_booking_order(uuid,integer,uuid,integer,text,text)', 'EXECUTE') as create_order_execute,
  has_function_privilege(role_name,
    'public.save_booking_draft(uuid,integer,jsonb)', 'EXECUTE') as save_draft_execute
from (values ('anon'), ('authenticated')) as roles(role_name);

select c.relrowsecurity, c.relforcerowsecurity,
  pg_get_userbyid(c.relowner) as catalog_owner,
  (select count(*) from pg_policy p where p.polrelid = c.oid) as catalog_policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'booking_private' and c.relname = 'catalog';

select p.proname, p.prosecdef, p.proconfig,
  pg_get_userbyid(p.proowner) as function_owner
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('save_booking_draft', 'create_booking_order');
```

Expected: both client roles have false schema/catalog privileges; only authenticated has true RPC EXECUTE. Catalog RLS is true, FORCE RLS false, catalog policies zero. Both RPCs are SECURITY DEFINER, have empty search paths and the same trusted owner as the catalog. PostgreSQL privilege inquiry functions account for inherited privileges; unexpected role memberships on a live project need separate investigation, never a permissive policy workaround.

References: [PostgreSQL row security, default denial and owner exemption](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [Supabase function execution/security](https://supabase.com/docs/guides/database/functions).

## 3. Numeric email OTP

Enable Email authentication and account signups. Under **Email Templates**, replace the **Magic Link** template with numeric-code content; also configure **Confirm signup** if used by your project's new-user settings:

```html
<h2>Your DummyTicket verification code</h2>
<p>Enter this code in the page where you requested it:</p>
<p><strong>{{ .Token }}</strong></p>
<p>If you did not request this code, ignore this email.</p>
```

Preserve `{{ .Token }}`. Do not substitute a confirmation URL or token hash. The app calls Supabase `signInWithOtp` (signup enabled) and `verifyOtp` with type `email`; it has no custom code generator or magic-link callback.

Set Email OTP length to match `NEXT_PUBLIC_SUPABASE_OTP_LENGTH` (6–10). Configure expiration and provider rate limits deliberately. Both server and input enforce the configured length. The browser shows a 60-second resend countdown, but Supabase enforces the real limits across reloads/browsers; longer waits may apply. The UI timer is not abuse protection.

In **URL Configuration**, set Site URL to `http://localhost:3000`; add that origin and `http://127.0.0.1:3000` if you use it to permitted development redirect URLs. Numeric code verification remains on the current page. Use one hostname consistently for cookies. The app allowlists internal post-login booking/order destinations; no passenger/contact data is placed in return URLs.

## 4. Email restrictions and SMTP

The built-in Supabase email provider is restricted to authorized project-team recipients, has low limits (currently documented as two messages/hour) and no delivery SLA. A correct key/template alone does not enable arbitrary customer email. Check the current [SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

For two independent test customer addresses, configure custom SMTP **in Supabase Authentication**: verify your sender/domain with your email provider, then enter SMTP host/port/credentials in Supabase. Test new-user and returning-user numeric emails and spam placement. The app never reveals whether an account existed and never echoes detailed provider errors.

## 5. Schema and authorization

- `booking_drafts`: UUID, owner, validated JSON, revision, draft/submitted status, timestamps. Saved only after complete review and verified sign-in; incomplete unsaved input stays in memory. Separate new bookings retain separate drafts. Stale revisions fail; exact retries return the existing save.
- `orders`: unique `DT-…` reference, unique draft, owner-scoped idempotency key, booking/price/policy snapshots, integer-paise amounts and timestamps. Separate statuses are fixed to `awaiting_payment` and `not_started` in this phase. The client sends its displayed unit price/policy version as an acceptance precondition, which the server compares to trusted config before creating an order. Resumed drafts require fresh confirmation so old consent is not reused for new terms.
- `order_sectors`, `order_passengers`, `order_contacts`: typed child records and timestamps. Return journeys include the reverse sector. Read policies follow order ownership.
- `booking_private.catalog`: schema/table privileges revoked from PUBLIC/anon/authenticated, RLS enabled with no client policies; inaccessible to customers. The owner-executed order RPC reads it. Mirrors `src/config/business.ts` prices and policy version/text. Change both using a reviewed **new migration**; drift fails closed.
- All five exposed customer tables enable RLS and grant authenticated customers SELECT only. No anonymous reads, unrestricted inserts, updates or deletes. No customer-editable staff field exists.
- Narrow SECURITY DEFINER save/create RPCs use empty search paths, explicit grants, `auth.uid()` and verified `auth.users` email. Database validation and a private price catalog protect direct RPC access. Server endpoints also use fresh `getUser` identity, shared Zod validation, ownership and server-calculated prices.
- Revision checks and advisory locks serialize draft changes. A single order RPC transaction creates every record; unique draft/idempotency constraints prevent retry duplicates. A second key for an already submitted draft returns its existing order. No queue or payment simulation exists.
- SSR clients use cookies; Next.js 16 `proxy.ts` refreshes verified tokens with `getClaims`. Never authorize using `getSession`. Private responses are no-store and request-time; Supabase server fetches are uncached. Personal data never enters browser storage, URLs, analytics or application logs. Auth cookies carry credentials, not booking drafts.
- No Storage bucket, public document URL or `storage.objects` policy is created. Admin uploads later require private Storage, staff authorization, RLS and authorized short-lived downloads.

## 6. Exact two-account live test

After development setup, run `npm ci`, then `npm run dev`; open `http://localhost:3000`.

1. Browser A: complete `/book` using synthetic future travel/passenger details and email A. Review and accept both confirmations. Verify the actual emailed code inline. Try incorrect/expired codes, resend and change-email too. Confirm entered details survive and the draft is saved.
2. Open **Open saved draft**, refresh and check every value. Visit `/account/orders`, resume, edit and save. Open the same revision in two tabs, save in the first, then try a different edit in the stale tab: it must report a conflict. New bookings must retain separate drafts.
3. While signed in as A, enter a different booking email. Saving must require explicit verified-email reconciliation plus renewed confirmation, or sign-out and verification of the other email. WhatsApp remains independent.
4. Create an unpaid order. Check reference/date, routes, passengers, amount/currency, contact, **Awaiting payment**, **Not started**, **Payments are not enabled yet**, and **No documents available yet**. Double-click/retry, including a lost-response scenario: only one order and one set of child records may exist.
5. Sign out and refresh the account route: expect login redirection. Sign back in as A from another browser: drafts/orders must remain available.
6. Browser/profile B: verify email B. Paste A's order and draft URLs: no A data may appear. Create a B booking and verify A cannot access it.
7. Using each customer's Supabase REST client with the publishable key and that customer's session (never a service-role key), select the other's IDs in all five tables: no rows. Directly update price, owner, payment/fulfilment, or insert/delete rows: permission denied. Try save/create RPCs with another owner's draft, wrong email, null/stale revisions or manipulated price: reject. Do not copy tokens into reports or shared shell history.
8. Repeat REST reads/RPC calls with only the publishable key and no session: deny access. Check private response headers for `no-store` and verify sign-out clears displayed private account pages.

Record actual outcomes. This live checklist was **not run** during implementation; real OTP, PostgREST/RLS configuration, two-browser persistence and simultaneous multi-connection retries remain pending.

## 7. Automated checks

```powershell
npm run lint
npm run typecheck
npm run test:database
npm run build
npm run test:browser
```

The browser suite's missing-configuration checks expect an **unconfigured build**. Run in an unconfigured checkout/environment. Tests labelled `MOCKED` intercept auth/save responses in Playwright: they do not send mail, establish Supabase sessions or verify deployed RLS. Public-page/form regression tests exercise the real local Next.js server.

`test:database` applies the exact migration to an isolated in-memory PGlite PostgreSQL instance with synthetic `auth.users`, `auth.uid()` and roles. It executes SQL and tests actual PostgreSQL grants/RLS, price protection, revision conflicts, sequential retry idempotency and rollback. It does not verify Supabase Auth, SMTP, PostgREST, pooling or concurrent connections, and never reads project credentials or connects externally.

Official references used: [SSR, identity, Next.js proxy and caching](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [numeric email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [rate limits](https://supabase.com/docs/guides/auth/rate-limits), [PGlite API](https://pglite.dev/docs/api).

Next: authenticated admin order management and private document upload. Payments and deployment remain separate later phases.
