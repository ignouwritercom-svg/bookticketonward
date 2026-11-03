<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DummyTicket project conventions

Read docs/PRODUCT.md, docs/DESIGN.md, docs/PAGES.md and docs/PROGRESS.md before expanding scope. Preserve the existing Next.js App Router, TypeScript, Tailwind design and package-lock.json.

## Commands
- `npm run dev`: local preview at http://localhost:3000 (Node, not XAMPP).
- `npm run lint`, `npm run typecheck`, `npm run build`: required checks.
- `npm run test:browser`: builds with empty Supabase configuration in child processes, then Playwright against a temporary production server on port 3100. Does not edit `.env.local`; rebuild normally before `npm start` afterward.
- `npm run test:admin`: isolated admin/document PostgreSQL and PDF checks with synthetic Auth/Storage, not live Supabase.
- `npm run test:database`: isolated PostgreSQL migration/RLS/transaction checks with synthetic Auth, not live Supabase.
- `npm ci`: install locked dependencies. Do not force dependency upgrades to clear audit warnings.

## Conventions and boundaries
- Shared business defaults are in src/config/business.ts. Prices and totals are integer minor currency units (paise), never floating-point rupees.
- React Hook Form owns in-memory form values. Shared Zod schemas in src/lib/trip.ts and src/lib/booking.ts own validation; reuse them in future server endpoints.
- BookingDraft is the incomplete form input interface; ValidatedBooking is the validated output interface. Future endpoints must revalidate, authorize and reprice.
- Phase four adds staff-only order management, private versioned PDFs and explicit publication/manual-delivery records. Existing customer OTP, drafts and unpaid orders remain. No payment integration, automatic outgoing delivery messages or deployment. Paid fixtures exist only in isolated tests; never simulate payment success in the application.
- Personal/passenger/contact data must not enter browser storage, analytics or logs. Send only to same-origin authenticated endpoints and configured Supabase. Homepage URLs allow trip type, route and dates; record URLs allow opaque UUIDs. Staff list URLs additionally allow reference/status/date filters. Explicit staff contact links may contain only the selected email/phone and order-reference message; never passenger details or DOB. No passport number/upload or postal address collection.
- Preserve keyboard focus, field-level errors, no-JavaScript public content, mobile layouts and reduced motion. Add/remove controls must use type=button.
- Customer/admin routes require fresh authentication and ownership/staff authorization. Noindex/robots are not access controls. Document transport uses a server-only secret AFTER session/RPC authorization; never use that client for general data reads. The private bucket denies direct client access; downloads use a no-store authenticated endpoint with authorization rechecked after Storage I/O.
- Keep account email required independently of delivery preference. Require a verified session and explicit email reconciliation before saving.
- Keep database catalog prices/policy synchronized with business.ts via a new migration; fail closed on drift. No direct customer table writes; narrow RPCs derive identity and price. Do not apply migrations without a confirmed development target.
- No invented PNRs, reviews, affiliations, live fares, availability, visa guarantees or fixed reservation validity. The service fee buys a temporary reservation document, not a paid airline ticket.
- Update progress and relevant product/route documentation after implementation. Do not deploy without an explicit request in a later phase.
