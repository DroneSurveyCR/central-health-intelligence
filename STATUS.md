# Central Health Intelligence (CHI) — STATUS

**Company:** Health Intelligency · **Product:** Central Health Intelligence (multi-tenant SaaS EHR)
**Patient layer concept:** Personal Health Intelligence (what patients own inside CHI)
**Updated:** 2026-06-29

**Last action:** CP1 — super-admin per-practice **module override** (`/superadmin/[id]` + `/api/superadmin/modules`), live + gated. Module enable/dependency logic DRY'd into one helper (`lib/modules/setModule.ts`) shared by the staff toggle + admin override; admin API now MFA-gated (`requireSuperAdminApi`). tsc clean, 82/82 unit green.
**Next action:** lead-capture intake form on the marketing site (basic name/email/phone → vertical → options).
**Done:** CP2 — super-admin **create + hand-off a new instance** (`/superadmin/new` + `/api/superadmin/provision`, reuses onboarding creation, returns a magic-link handoff). Vertical bundles DRY'd into `lib/modules/bundles.ts` (shared by onboarding + admin). tsc clean, 82/82.

> Single source of truth. Score detail → `SCORECARD.md`. What's left to go live → `ACTIVATION.md`.
> Older wave-by-wave narrative is in `SCORECARD.md`'s Wave log. This file is the current snapshot only.

## Where it stands: BUILT · DEPLOYED · GREEN

The sellable multi-tenant app is complete and live. Not a scaffold — the full product.

- **Live:** https://healthsync-cloud-mu.vercel.app
- **Repo:** `DroneSurveyCR/central-health-intelligence`, branch `main`
- **Deploy — ONE source of truth:** a single Vercel project on the **personalhealthintelligence**
  account, connected to this GitHub repo with **git auto-deploy** (production branch `main`).
  **Push to `main` → auto-deploys to `-mu`.** No manual CLI deploys, no duplicate projects.
  (The old DroneSurveyCR `healthsync-cloud`/`-pi` duplicate was deleted 2026-06-29.)
- **Build/test health (verified 2026-06-28):** `tsc` clean · **82/82** unit tests · Playwright e2e 21/21 ·
  smoke gate 45/45 · runtime tenant-isolation **0 leaks across 18 tables**
- **Score:** **116/140** — the buildable production ceiling. The remaining ~24 points are
  external-gated (clinician sign-off, BAAs, live keys, dev-app approvals, legal) — see `ACTIVATION.md`.
- **`middleware.ts` is ACTIVE + edge-safe** (uses global Web Crypto, NOT Node `crypto` — the
  latter crashed the Edge runtime and silently froze prod on an old build; fixed 2026-06-28).

## What's built (all gated, all deployed)

- **Tenancy** — `practice_id NOT NULL` on every tenant table, RLS + tenant policies, `current_practice_id()`,
  `requireModule()` gating. Tenant #1 = Casa Elev8 (Randi), 168 patients ETL'd. Cloud DB `aezudceznxclvexfpdvr`,
  migrations 001–003 (tenancy) + module/feature migrations through 013.
- **Platform super-admin** — `/superadmin` cross-tenant dashboard + **per-practice detail with module override** (`/superadmin/[id]`) + **create & hand-off a new instance** (`/superadmin/new` → `/api/superadmin/provision`, magic-link handoff). Service-role writes, email-allowlist + MFA gated (`SUPERADMIN_EMAILS`).
- **All vertical modules** with working surfaces: peptide, psychedelic/KAP, longevity, hrt, labs, wearables,
  nutrition, weight, rx (printable script v1), telehealth (Jitsi), dispensary.
- **Intelligence layer (Part 9)** — `/focus` morning briefing (buildDelta + nightly cron), alerts engine + `/triage`,
  `ai_drafts` → `/approvals`, `/desk` + `care_team` + `tasks`.
- **Marketplace (Part 10)** — modalities catalog (13 seeded) + recommend + outcomes + course tracking.
- **Patient experience** — `/connections` (self-serve device OAuth + consent grid), engagement (`/today` streaks/
  milestones/nudges), `/assistant` (grounded + safety-gated, **AI ACTIVATED**), module-driven PatientNav, `/updates`.
- **Connector sync engine (the moat)** — job queue (SKIP-LOCKED claim, idempotent), encrypted OAuth tokens,
  Withings/Dexcom/Garmin providers + webhook HMAC + per-connector rate limiting. Proven end-to-end via sandbox
  (90-day backfill → tenant-scoped rows). Activates per provider when dev-app creds are set.
- **Billing — two layers (do not conflate):**
  - *Platform SaaS billing* (clinic → CHI): one Stripe account. Plan checkout + entitlements + per-provider seats +
    customer portal + one-time HIPAA setup fee + Stripe Tax. Proven in test mode (webhook flips plan→modules).
  - *Patient billing* (patient → clinic): per-tenant via **Stripe Connect (Standard)**, 0% platform fee. Wired;
    activation needs Connect enabled + `STRIPE_CONNECT_*`.
- **Security/compliance** — RLS proven, tokens encrypted, MFA (TOTP), audit-log WORM + `/audit` viewer,
  rate limiting on all 12 API routes, CSP/HSTS/XFO headers, X-Request-ID correlation, 13 perf indexes.
- **Reports v1** (`/reports` + CSV) and **GDPR Art.20 export** (full bundle, all module tables).

## Open software (non-blocking, no external dependency) — the "finish it off" list

1. `requireStaffApi()` — enforce MFA (AAL2) step-up on staff API routes (today: `getCurrentPractitioner()` only).
2. Final hardening code-review pass across tenant-isolation + billing + connector surface.
3. Housekeeping: gitignore `test-results/`; confirm `NEXT_PUBLIC_APP_URL` set in Vercel prod.

## Deferred (needs a real customer to justify) — `BACKLOG.md`

- Subdomain / custom-domain routing for per-tenant public pages (needs Vercel wildcard config).
- Full multisite per-location data scoping.
- Enterprise dedicated/self-hosted HIPAA tier (build on demand when a HIPAA client signs).

## To go live — NOT code, see `ACTIVATION.md`

Clinician signs `CLINICAL-REVIEW.md` · Stripe LIVE keys · Stripe Connect enable · wearable OAuth dev-apps ·
BAAs (US PHI only) · Resend domain · legal stack. Each is wired and degrades gracefully until you supply the input.

## Conventions

Update this file after every task. Don't deploy/push without go-ahead. Keep it a snapshot — history goes in SCORECARD's Wave log.
