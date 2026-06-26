# HealthSync Cloud — STATUS

**Updated:** this session
**Phase:** Phases 1–3 DONE (app stood up, modules ported + gated, onboarding) — not deployed.
**Last action:** Seeded the Cloud Next.js app from Randi's minimal core; ported the 7 modules from
`../healthsync-app@modules-for-cloud` with `requireModule` gating; built onboarding; gated module
links on the patient record. `npm run build` PASS, `tsc` PASS, tenant-isolation PASS. Commit `a8db3a5`.
**Next action:** Deploy (Vercel + point Supabase auth redirect allow-list) OR continue building
(connectors gating, patient-experience, marketplace) — needs direction. Deploy needs the user's
Vercel/Supabase-dashboard access.
**Blockers:** deploy = external (Vercel project + Supabase auth URL config).

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
