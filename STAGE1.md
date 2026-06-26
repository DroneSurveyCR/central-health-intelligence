# Track B · Stage 1 — Morning Report

Built unattended overnight. Stage 1 = the **tenancy foundation** (the highest-risk part of the
multi-tenant conversion). Everything is **ready-to-apply** and **QA'd**, grounded in the *real*
Casa Elev8 schema (introspected read-only — Randi's production was never modified).

## TL;DR

- ✅ Provisioning: hit the org's free-tier limit (2 active projects) — **needs your call** (upgrade to Pro ~$25/mo, or free a slot). I built everything ready-to-apply so this didn't block progress.
- ✅ Tenancy migrations `001 → 003` authored against the real 38-table / ~75-policy / 6-helper schema.
- ✅ Module system (`manifest` + `resolveModules` + `requireModule`) — **9/9 logic tests pass**.
- ✅ ETL (Casa Elev8 → Cloud as practice #1) + tenant-isolation gate written and turnkey.
- ✅ QA: full coverage verification, static SQL validation, self-score **66/70 (94%)**. The −4 is purely "not yet executed against a live DB" (blocked on provisioning), not on the work.

## What got built (`C:\Users\nicki\Desktop\claude\healthsync-cloud`)

```
supabase/migrations/001_practices.sql   practices table (tenant root) + Casa Elev8 seeded as practice #1
supabase/migrations/002_practice_id.sql practice_id NOT NULL (no default) on all 36 tenant tables + FK + index
supabase/migrations/003_tenant_rls.sql  current_practice_id() + practice_has_module() + practice-aware
                                         can_access_patient() (keystone) + 39 RLS policies scoped to practice
lib/modules/{types,manifest,index,requireModule}.ts   the gating keystone
scripts/etl-casa-elev8.mjs              migrate Randi's 142 patients in as practice #1 (dry-run default)
scripts/test-tenant-isolation.mjs       the launch gate: practice #2 must see 0 rows of practice #1
package.json / .env.example / .gitignore  turnkey harness
README.md / QA.md / STAGE1.md           docs
```

## The key design decision (why it's safe)

`can_access_patient()` is called by ~18 staff RLS policies. Making **that one function**
practice-aware (`patient.practice_id = current_practice_id()`) makes all 18 tenant-safe at once.
I then hand-rewrote only the genuine gaps — the ~39 policies that used `is_staff()/is_admin()/
public true/active` with no practice scope, plus the 4 join/child tables (`invoice_items`,
`plan_items`, `plan_phases`, `body_map_findings`) that are the classic cross-tenant leak surface.
Patient-self policies (`patient_id = current_patient_id()`) are provably safe without change
(proof in QA.md §2). `practice_id` is **NOT NULL with NO default** — a missing tenant id is a hard
error, never a silent misfile.

## QA performed (you asked me to run QA + score)

1. **Coverage** — 36/36 tenant tables get practice_id; every one of ~75 policies categorized
   (18 auto-secured · 39 rewritten · 18 patient-self-safe · 1 global). No policy grants
   cross-practice access.
2. **Module logic** — ran 9 assertions on `resolveModules` (transitive deps, unknown-id handling,
   empty/null) → **9/9 PASS** (e.g. `peptide → {core,peptide,rx}`, `longevity → {core,labs,longevity}`).
3. **Static SQL** — `create policy`(39) == `drop policy`(39) → idempotent; all referenced tables
   real; dollar-quotes balanced.
4. **Self-score 66/70** — see QA.md §8. Fixes made during QA loops: FK creation guarded for
   re-runs; `practice_settings` singleton dropped via `DROP COLUMN CASCADE`; helper `search_path`
   hardened to `public, pg_temp`; corrected a module-resolution example in the docs.

## What needs YOU (decisions / provisioning)

1. **Supabase project** — free-tier slot is full in the "drone services Costa Rica" org. Either
   upgrade to Pro (~$25/mo — also the path to the BAA/HIPAA tier you'll need for production anyway),
   or pause an idle project (`andrejette-ai` / `nwc` — I won't guess which is safe).
2. **Cloud baseline** — when applying, the baseline must be a **schema dump of the live Casa Elev8
   DB** (`supabase db dump` / `pg_dump --schema-only`), NOT this repo's delta migrations, because
   the live DB has tables added out-of-band. Then apply 001 → 002 → 003 on top. (QA.md §7.1.)
3. **Pricing** — still "decide later" (2 plan names + setup-fee number) — not needed for Stage 1.

## Apply checklist (when the project exists)

1. Provision the Cloud project (US region). 2. Load baseline = live Casa Elev8 schema dump.
3. Apply `001 → 002 → 003`. 4. `npm i && npm run etl:dry` (review counts) → `npm run etl:apply`.
5. `npm run test:tenant-isolation` → **must print PASS before any 2nd tenant.**

## Then Stage 2

Parity + Reports (labels/waitlist/insurance UIs already have DB tables; SOAP draft/finalized;
3 core reports + CSV) → Stage 3 the plant-medicine (KAP) wedge → first non-US sale.

## Other open thread
- **AppFlowy hub** on the VPS (your "track it all in a Notion-style hub") — deferred to after
  Stage 1 per your choice. Ready to set up next session.
