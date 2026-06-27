# HealthSync Cloud — STATUS

**Updated:** this session
**Phase:** Phases 1–3 DONE (app stood up, modules ported + gated, onboarding) — not deployed.
**Last action:** Seeded the Cloud Next.js app from Randi's minimal core; ported the 7 modules from
`../healthsync-app@modules-for-cloud` with `requireModule` gating; built onboarding; gated module
links on the patient record. `npm run build` PASS, `tsc` PASS, tenant-isolation PASS. Commit `a8db3a5`.
**DEPLOYED & LIVE:** https://healthsync-cloud-mu.vercel.app (personalhealthintelligence Vercel team).
Public pages 200; protected routes 307→/login (auth enforced by layouts); onboarding API validates.
**Platform super-admin LIVE:** `/superadmin` cross-tenant dashboard (lists every practice + patient/staff
counts). Gated by email allowlist (`SUPERADMIN_EMAILS` env), bypasses RLS via the service-role admin client.
Login `personalhealthintelligence@gmail.com`. Read-only v1 — per-tenant detail, impersonation, plan/module
management, and MRR are the next increment (plan Part 1.7).
**Next action:** clinical-logic review (human); re-add a proper edge-safe middleware (session refresh);
set NEXT_PUBLIC_APP_URL; subdomain routing for public marketing pages.
**Blockers:** none for the working app. Clinical review = needs human.

### Three greenfield blocks (this push)
- **Clinical-logic safety audit** → `CLINICAL-REVIEW.md`. 3 parallel auditors found go-live-blocking defects.
  Applied STRICTLY-SAFER guardrails (block more, never approve more; exact thresholds still need a clinician):
  peptide dose ceiling+positivity (`MAX_DOSE_MG`), KAP fail-safe screening (no "cleared" on missing data,
  ibogaine needs ECG) + journey-session gated on a non-contraindicated screening, PhenoAge require-9-markers
  + SI plausibility refusal + divisor typo fix. ⛔ verticals NOT cleared for live patients until clinician signs `CLINICAL-REVIEW.md`.
- **Connector sync engine (the moat)** — `lib/connectors/sync/*` + `app/api/connectors/[slug]/{authorize,callback,webhook}`
  + `app/api/cron/sync` + migration 005 (claim-with-SKIP-LOCKED job queue, scheduling cols, idempotency
  constraint). Providers: **sandbox** (no creds, proves the loop) + **Oura** (real OAuth, activates when
  `OURA_CLIENT_ID/SECRET` set). **PROVEN end-to-end on prod**: cron claimed 2 jobs, upserted 15 tenant-correct
  daily summaries (practice_id = Casa Elev8 only). Cron = daily Vercel cron, auth via `CRON_SECRET`.
- **SaaS billing** — `lib/billing/{plans,practice}.ts` + `app/api/billing/checkout` + extended Stripe webhook
  (subscription events → `practices.plan` + `practices.modules` via `entitlementsForPlan`) + `/settings/billing` UI.
  Plans starter/growth/network/enterprise → module entitlements. Activation-ready: needs `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`. Degrades cleanly today (checkout 503, UI shows reference).

### Deploy notes (what it took)
- Vercel project under personalhealthintelligence (token-based CLI deploy). Supabase auth redirect
  allow-list set via Management API. Vercel Deployment Protection disabled (public SaaS access).
- **Root cause of all the 500s/404s:** the bare `vercel project add` left `framework: null`, so Vercel
  ran `next build` but never wired Next's routing → static-only → 404 on every SSR route. Fix: set
  project `framework: "nextjs"`. The earlier `__dirname` 500 was the edge middleware in that broken build.
- **Middleware currently DISABLED** (`middleware.ts.disabled`) — auth is enforced by the (staff)/(patient)
  layouts, so the app is functional + secure without it. Re-add a proper edge-safe middleware later
  (session refresh + early bounce). The seeded Supabase-SSR middleware is rejected by Vercel's Edge bundler.
- Webpack prod build required extracting page-exported helpers into `lib/{labs,report}/components.tsx`.

## Added since Phase 3 (this push)
- **Connector/import gating** — import routes check `moduleForConnector` + enabled modules (closes the RLS-bypass gap).
- **Admin Modules UI** — `/settings/modules` toggles a practice's modules on/off (admin-only).
- **Positive login checkpoint PASS** — a practice-#1 user logs in and sees exactly their 168 patients.
- **Audit logging fixed** — `logAudit` now sets `practice_id` (was silently failing on NOT NULL).
- **Migration 004: `practice_id` default = `current_practice_id()`** — fixes ALL app inserts (writes
  auto-fill the caller's own practice; isolation still holds). Verified with a real insert.

## Done this phase (verified)
- Multi-tenant Next.js app (349 files) builds clean against the Cloud DB.
- 7 vertical modules ported + **gated** (`requireModule` → `/upgrade` if practice lacks it).
- Module links on the patient record show only enabled modules.
- Onboarding flow: new practice → creates practice + owner practitioner + auth user (default modules).
- Tenant-isolation gate still PASS.

---

## What exists now (verified)
- **Cloud DB** `aezudceznxclvexfpdvr` — full multi-tenant schema, tenancy migrations 001–003 +
  module migrations 021–028, `practice_id NOT NULL` across all tenant tables.
- **Tenant-isolation gate: PASS** (practice #2 sees 0 rows of practice #1).
- **Tenant #1** = Casa Elev8 (Randi) — 168 patients + her data ETL'd in.
- **Toolchain** (`scripts/`) — provision/clone/grants/etl/migrate/isolation, all working via Management API.
- **No Cloud app yet** — this repo is DB + scaffold (module manifest, lib/modules) + scripts. The
  actual sellable Next.js app does not exist yet.
- **Module code** parked on `healthsync-app@modules-for-cloud` (psychedelic, peptide, biomarker,
  nutrition, longevity, wearables, AI drafts) — to be ported leanly, per phase, with gating.

## What is intentionally NOT here
- Randi's Casa Elev8 app/DB — separate, minimal, near-launch. Don't build product modules into it.

## Lean Phase plan (draft — confirm before executing)
- **Phase 1 — Cloud app core.** Seed the multi-tenant Next.js app (core only: auth w/ practice_id,
  patients, notes, scheduling, billing). Checkpoint: one tenant logs in, sees only their patients;
  isolation still passes. NO vertical modules.
- **Phase 2 — Onboarding + module gating.** New-practice signup; `requireModule` wired so a tenant
  sees only enabled modules. Checkpoint: create a 2nd tenant via UI; gating verified.
- **Phase 3 — First vertical module (the wedge).** Port ONE module from the branch, gated. Checkpoint:
  enable it for one tenant, it's hidden for another.
- Everything else (more modules, marketplace, patient app depth, Stripe, OAuth) → `BACKLOG.md`.

## Conventions
- Update this file after every task. Don't skip checkpoints. Don't deploy/push without go-ahead.
