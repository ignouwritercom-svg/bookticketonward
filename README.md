# DummyTicket — public content, booking and staff document workflow

The 5 November admin expansion adds order queues, a private document library, customer search/history, structured website editing, approved contacts, runtime prices/policies and revision history for the existing admin. Start with [ADMIN_WORKSPACE.md](docs/ADMIN_WORKSPACE.md): the fifth migration and server flag are manual prerequisites. Routine approved content updates then use draft, preview and publish without a code change or rebuild. Customer workspace details are in [CUSTOMER_WORKSPACE.md](docs/CUSTOMER_WORKSPACE.md).

The 4 November customer-facing review removes obsolete development notices and replaces setup errors with actionable customer messages. Owner tasks, pending business approvals and the deployed account-configuration check are documented in [LAUNCH_READINESS.md](docs/LAUNCH_READINESS.md) and the protected staff overview. Policy pages remain provisional; payment processing remains on hold.

Phase 6 adds all public service/help/policy routes, two sourced destination pages, three guides and technical SEO. [SEO_ARCHITECTURE.md](docs/SEO_ARCHITECTURE.md) explains the approved canonical domain, explicit launch indexing switch, draft-policy restrictions, content model and verification. Preview remains noindex; payments remain on hold.

Phase 5 is documented, not implemented: [payment architecture and gateway-selection requirements](docs/PHASE5_PAYMENTS_ARCHITECTURE.md). Existing payment restrictions remain active.

Hotel-only and Flight + Hotel are now implemented too. Open `/book?service=hotel` or `/book?service=combo`; follow [HOTEL_SETUP.md](docs/HOTEL_SETUP.md) for the full three-migration order. Approved preview fees: hotel ₹699/traveller/stay, standard combo ₹1,199 and multi-city combo ₹1,499 with one hotel. [Competitor research](docs/COMPETITOR_RESEARCH.md) records the product comparison and pricing units.

A responsive dummy-ticket service with Next.js App Router, TypeScript, Tailwind, React Hook Form and Zod. Customer OTP, drafts and unpaid orders are preserved; Phase four adds protected staff order management, private PDF versions, explicit publication/manual-delivery records and owner-authorized downloads. No payment integration or deployment.

[ADMIN_SETUP.md](docs/ADMIN_SETUP.md) documents the earlier document migration, private bucket/server-only secret and first-admin assignment. Do not rerun applied migrations or reassign staff to enable the expanded workspace. Open `/admin` with the existing staff account. Genuine unpaid orders remain blocked from fulfilment.

## Start the preview

Requirements: Node.js >=22 (required by the installed Supabase SDK) and npm. Verified environment: Node.js 24.14.0 / npm 11.9.0.

```powershell
cd C:\xampp\htdocs\dummy-ticket-website
npm ci
npm run dev
```

Open http://localhost:3000. If dependencies are already installed, run only `npm run dev` from the project directory. This is a Next.js Node server; XAMPP/Apache is not used.

## Verification

```powershell
npm run lint
npm run typecheck
npm run test:database
npm run test:admin
npm run test:management
npm run test:notifications
npm run test:admin:workspace
npm run test:browser -- --seo-indexable
npm run build
npm start
```

`npm run test:browser` builds with empty Supabase configuration in child processes, then runs homepage/booking/account/admin/public SEO/mobile/accessibility checks on a temporary production server on port 3100. It never edits `.env.local` or uses real credentials. Disposable Playwright artifacts use `test-results/browser` so its automatic cleanup cannot delete historical evidence elsewhere in `test-results`. Rebuild normally before `npm start` afterward. It uses an existing cached Chromium when available. On another machine, run `npx playwright install chromium` once, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. See docs/PROGRESS.md for actual results and limits.

## Try the booking flow

1. Open http://localhost:3000, choose a trip and enter a route/future dates in the starter, then choose **Book Dummy Ticket**. Or open http://localhost:3000/book directly.
2. Complete one-way/return details, or add two to four multi-city sectors in date order.
3. Enter passenger names, DOB and sex on the travel document. Try adding/removing passengers (up to six), the single-name option, and watch the total update.
4. Enter an account email, choose email or WhatsApp delivery (WhatsApp requires +country code), and optionally add instructions.
5. Review the draft; try the Edit actions and Back/Next. Read the draft service terms and tick both confirmations.
6. **Continue to sign in** opens inline email verification. After verification, the draft is saved; choose **Create order — awaiting payment** to create an unpaid order. Already signed-in customers save directly after reconciling their account email.
7. Visit `/account/orders` to resume drafts or view orders. Open the saved-draft link to restore it after refresh. Unsaved changes remain in memory only. Missing Supabase configuration shows an unavailable state.

See [Supabase development setup](docs/SUPABASE_SETUP.md) for configuration and migration tracking. Earlier hosted document integration evidence is retained in the progress documentation. The admin workspace expansion uses isolated PostgreSQL/browser checks; it does not repeat hosted Storage checks or automatically apply its new migration.

## Edit the project

- `src/config/business.ts`: seed integer-paise prices, immutable service limits, currency and default hours/delivery target. After management setup, edit runtime fees, timing and acceptance text in the authorized admin settings, not by changing only a seed value.
- `src/app/page.tsx`: server-rendered homepage content.
- `src/app/globals.css`: design tokens and responsive styles, with Tailwind v4.
- `src/components/booking/`: four-step form, shared field controls and review.
- `src/app/book/booking.css`: booking layout that uses the existing design tokens.
- `src/components/`: shared navigation, public content, validated booking, account and staff UI.
- `src/lib/trip.ts` / `src/lib/booking.ts`: shared validation and draft interfaces.
- `docs/`: scope, route plan, visual system and progress.

The full public/customer/admin route inventory is in [PAGES.md](docs/PAGES.md). Homepage samples remain illustrative. New orders remain Awaiting payment / Not started; private fulfilment requires a verified paid status. Payment integration remains on hold and this work does not deploy. No booking data is stored in browser storage. Explicit staff contact links contain only the selected contact and an order-reference message.

Locked dependencies include `@supabase/supabase-js` and `@supabase/ssr`. `test:database` uses isolated PGlite PostgreSQL with synthetic Auth; browser tests labelled MOCKED intercept service responses. Neither verifies live email delivery or a configured Supabase project. See docs/PROGRESS.md for checks actually completed and remaining verification.
