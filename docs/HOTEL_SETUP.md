# Hotel and Flight + Hotel setup

## Migration order

1. `supabase/migrations/202610220001_customer_bookings.sql` — already applied according to the user; do not rerun.
2. `supabase/migrations/202610220002_admin_documents.sql` — apply once if not already applied; follow [ADMIN_SETUP.md](ADMIN_SETUP.md).
3. `supabase/migrations/202611020001_hotel_reservations.sql` — new additive hotel/combo migration, after both predecessors.

The agent has not run these on hosted Supabase. Confirm the development project; open each unapplied file in order, paste the entire file into a fresh SQL Editor query and run once. Record successful filenames/dates in your manual migration log. SQL Editor does not fill CLI migration history. Do not replay applied files, reset the database or disable RLS.

The hotel migration retains existing flight orders/drafts, adds a private hotel price/policy catalog and typed hotel snapshots, and replaces narrow validators/order RPCs. Explicit grants and RLS preserve owner-only hotel reads and active staff reads. The catalog has RLS with no customer policies and revoked client privileges.

Document labels are Dummy Flight Ticket, Dummy Hotel Booking, and Dummy Flight + Hotel Combo. Existing PDFs default to flight. A combo remains Processing until both ready types, or one combined PDF, exist. Both types must be published before manual delivery can be recorded. Staff must verify that hotel PDFs cover all requested stays/travellers; the app does not parse reservation contents or establish authenticity.

No new hotel environment settings are needed. Private uploads/downloads still need `SUPABASE_SECRET_KEY` as documented in ADMIN_SETUP.md. Existing `.env.local` is unchanged. Restart dev after adding that server-only setting; refresh the page after migrations.

## Open and test

- `/book?service=flight`: retained one-way/return/multi-city flow.
- `/book?service=hotel`: stays without flight fields.
- `/book?service=combo`: flight + stays; names/contact entered once.
- `/account/orders`: drafts and orders show their service and stays.
- `/admin/orders`: filter by service, inspect stays, upload correct document types and publish explicitly.

Every stay includes all travellers. Rooms must be 1–6 and cannot exceed travellers. Check-out follows check-in; maximum four non-overlapping stays of up to 30 nights each. Hotel preferences do not promise a property. Only the service enum is added to URL prefill; hotel/personal details stay in memory until authenticated saving.

Approved prices: hotel ₹699/traveller/stay; standard combo ₹1,199/traveller; multi-city combo ₹1,499/traveller with one hotel. Extra stays add ₹699/traveller each. Application and PostgreSQL independently check prices/policy; existing flight prices and order snapshots remain. See [competitor research](COMPETITOR_RESEARCH.md).

## Verification boundaries

`npm run test:admin` applies all three migrations to isolated PGlite with synthetic Auth/Storage metadata and paid fixtures. It covers validation, price tampering, owner/staff RLS, immutable hotel snapshots and complete combo document requirements. `npm run test:browser` exercises UI and mocked saving with empty child-process Supabase settings; it does not establish hosted Auth/Storage correctness.

After manual setup, create real unpaid hotel/combo orders through OTP; refresh/resume, verify another customer cannot read them, and inspect staff filters/snapshots. Genuine orders must remain unpaid. Test actual paid upload/download only in disposable local Supabase with synthetic fixtures or after future verified gateway confirmation. No payment bypass or payment integration was added.
