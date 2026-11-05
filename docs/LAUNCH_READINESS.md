# Owner-only operational checklist

Reviewed 4 November 2026. This document and the freshly authorized `/admin` overview hold owner tasks. Do not paste these tasks into customer marketing text or shared UI. This is not evidence of a production launch being complete.

## Deployed account configuration

A read-only, anonymous check of the deployed `/api/auth/session` returned HTTP 200 with `configured: false`. `/login` also displayed its unavailable state. This confirms the application's availability guard is closed; it does **not** identify which Coolify setting is absent/invalid. No keys, tokens, environment values or cookies were captured in the audit report.

The local `.env.local` is Git-ignored and is not carried to Coolify by the repository push. In Coolify, verify these names privately:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_OTP_LENGTH` (must match the Auth project's numeric email code length; implementation accepts 6–10)

Next.js embeds `NEXT_PUBLIC_` references at build time. Supply the approved public configuration for both build and runtime, then rebuild/redeploy after configuration changes. Do not print values or commit `.env.local`. `SUPABASE_SECRET_KEY` is server-only, needed for document transport at runtime, and must never be renamed with a `NEXT_PUBLIC_` prefix. No authentication guard, session verification or database permission should be bypassed to make the UI appear available.

## Required business decisions

- Owner confirmed public support email and telephone/WhatsApp contacts are **not final**. No contact was invented and no enquiry form pretends to send messages. Supply verified channels before offering direct support or accepting paid bookings.
- Approve the business identity and complete the terms, privacy/controller/provider/retention disclosures, cancellation rules, refund conditions and complaints channel. Policy pages remain provisional and noindex; this content cleanup does not approve them or create legal entitlements.
- Confirm service availability, advertised working hours and the conditional preparation target before accepting payments. No guarantee of visa approval, fixed validity, universal acceptance or paid travel is offered.
- Gateway integration remains on hold. Use the separate payment architecture proposal; only verified gateway evidence may establish payment. Unpaid orders cannot enter fulfilment or receive published documents.
- Configure and verify the separate notification worker and SMTP delivery; Supabase's sign-in SMTP does not configure order emails. No email/WhatsApp delivery was sent during this review.
- Review indexing configuration separately after approval. This presentation change does not enable indexing or remove private-route noindex/authentication restrictions.

## Evidence and scope

The read-only production audit visited home, pricing, contact, terms, login and booking at 390px, all HTTP 200 with no horizontal overflow in those views. It confirmed stale preview text, business approval instructions and missing deployed account configuration. Evidence: `test-results/public-copy-audit-a861dadd-3199-4f73-a0db-d695be834bbc/` (ignored local screenshots/report).

Local implementation removes phase/setup instructions, corrects stale service descriptions, provides real help navigation and keeps necessary payment/provisional-policy notices. Authoritative policy text/versions, order snapshots, prices, credentials, migrations, database security and notification/payment functionality are unchanged. Local automated browser checks use empty Supabase configuration or synthetic/mocked fixtures; they do not establish live authenticated production success. Current verification results are recorded in PROGRESS.md.
