# HealthSync Cloud — STATUS

**Updated:** this session
**Phase:** Pre-Phase-1 (foundation done; app not yet started)
**Last action:** Adopted Karpathy-lean methodology. Reverted Randi's app + DB to minimal
(module work parked on `../healthsync-app` branch `modules-for-cloud`; her module tables dropped).
**Next action:** Define + execute **Phase 1** — stand up the Cloud Next.js *app* (multi-tenant core
only, no vertical modules) running against the Cloud DB, one tenant can log in and see their data.
**Blockers:** none.

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
