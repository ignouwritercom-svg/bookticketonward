# DummyTicket — public content, booking and staff document workflow

Phase 6 adds all public service/help/policy routes, two sourced destination pages, three guides and technical SEO. [SEO_ARCHITECTURE.md](docs/SEO_ARCHITECTURE.md) explains the approved canonical domain, explicit launch indexing switch, draft-policy restrictions, content model and verification. Preview remains noindex; payments remain on hold.

Phase 5 is documented, not implemented: [payment architecture and gateway-selection requirements](docs/PHASE5_PAYMENTS_ARCHITECTURE.md). Existing payment restrictions remain active.

Hotel-only and Flight + Hotel are now implemented too. Open `/book?service=hotel` or `/book?service=combo`; follow [HOTEL_SETUP.md](docs/HOTEL_SETUP.md) for the full three-migration order. Approved preview fees: hotel ₹699/traveller/stay, standard combo ₹1,199 and multi-city combo ₹1,499 with one hotel. [Competitor research](docs/COMPETITOR_RESEARCH.md) records the product comparison and pricing units.

A responsive dummy-ticket service with Next.js App Router, TypeScript, Tailwind, React Hook Form and Zod. Customer OTP, drafts and unpaid orders are preserved; Phase four adds protected staff order management, private PDF versions, explicit publication/manual-delivery records and owner-authorized downloads. No payment integration or deployment.

Start with [ADMIN_SETUP.md](docs/ADMIN_SETUP.md) for the new additive migration, private bucket/server-only secret and controlled first-admin assignment. The existing customer migration must not be rerun. Open `/admin` after setup and sign in with the assigned staff account. Genuine unpaid orders remain blocked from fulfilment.

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

Complete [Supabase development setup](docs/SUPABASE_SETUP.md): `.env.local`, the SQL migration, numeric OTP template and SMTP. The user has confirmed working development OTP and persistent orders. The agent has not applied the new admin/hotel migrations or performed hosted Storage checks; the setup guides contain the remaining steps.

## Edit the project

- `src/config/business.ts`: placeholder brand, integer-paise prices, passenger/sector limits, currency, hours and delivery target.
- `src/app/page.tsx`: server-rendered homepage content.
- `src/app/globals.css`: design tokens and responsive styles, with Tailwind v4.
- `src/components/booking/`: four-step form, shared field controls and review.
- `src/app/book/booking.css`: booking layout that uses the existing design tokens.
- `src/components/`: navigation, validated trip starter and development notices.
- `src/lib/trip.ts` / `src/lib/booking.ts`: shared validation and draft interfaces.
- `docs/`: scope, route plan, visual system and progress.

Implemented routes: `/`, `/book`, `/login`, `/account/orders`, `/account/orders/[orderId]`, `/admin`, `/admin/orders`, `/admin/orders/[orderId]`. Homepage samples remain illustrative. New orders remain Awaiting payment / Not started; private fulfilment requires a verified paid status. Payment integration and deployment remain later phases. No booking data is stored in browser storage. Explicit staff contact links contain only the selected contact and an order-reference message.

Locked dependencies include `@supabase/supabase-js` and `@supabase/ssr`. `test:database` uses isolated PGlite PostgreSQL with synthetic Auth; browser tests labelled MOCKED intercept service responses. Neither verifies live email delivery or a configured Supabase project. See docs/PROGRESS.md for checks actually completed and remaining verification.
