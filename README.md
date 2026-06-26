# HealthSync Cloud

The multi-tenant SaaS build of HealthSync — sold worldwide to health/wellness practitioners.
Sibling product to **Casa Elev8** (`../healthsync-app`), which is Dr. Randi Raymond's live
single-tenant app and becomes **Tenant #1** here.

> North Star: *Real-time health intelligence — every data source, one patient picture, doctor-supervised AI.*
> Strategy & full plan: `~/.claude/plans/so-what-would-this-cheeky-wave.md`

## What's in this scaffold (Track B, Stage 1 — tenancy foundation)

This repo currently contains the **tenancy foundation** — the highest-risk, highest-value part of
the multi-tenant conversion — authored against the **real, introspected Casa Elev8 schema** (37
tables, ~75 RLS policies, 6 helper functions). It is **ready-to-apply** but not yet applied (the
Cloud Supabase project is being provisioned separately).

```
supabase/migrations/
  001_practices.sql        — practices table (tenant root) + Casa Elev8 seeded as practice #1
  002_practice_id.sql      — practice_id NOT NULL (no default) on all 36 tenant tables + FK + index
  003_tenant_rls.sql       — tenant-aware helpers + every RLS policy scoped to current_practice_id()
lib/modules/
  types.ts                 — ModuleId + manifest types
  manifest.ts              — the typed module registry (deps, connectors, always-on)
  index.ts                 — resolveModules() (expands transitive deps)
  requireModule.ts         — the server-side gate (mirrors lib/auth/roles.ts requireStaff pattern)
scripts/
  etl-casa-elev8.mjs       — migrate Randi's 142 patients from her project into Cloud as practice #1
  test-tenant-isolation.mjs— the Stage 1 launch gate: a 2nd practice must see 0 rows of practice #1
QA.md                      — coverage verification vs the real catalog + self-score
STAGE1.md                  — morning report: what's done, how to apply, what's next
```

## How to apply (when the Cloud Supabase project exists)

1. Seed this repo from a copy of `../healthsync-app` (brings the baseline single-tenant schema + app code).
2. Point at the **empty** Cloud Supabase project.
3. Apply baseline schema, then `001 → 002 → 003`.
4. Run `scripts/etl-casa-elev8.mjs` (needs both projects' service-role keys via env).
5. Run `scripts/test-tenant-isolation.mjs` — **must pass before any 2nd tenant is created.**

## Critical invariants (do not violate)

- `practice_id` is **NOT NULL with NO default** on every tenant table — a missing tenant id must be a
  hard error, never a silent default into another tenant.
- Connectors use the admin client and **bypass RLS** — module/tenant gating for connector writes lives
  in the API route layer, not RLS.
- The tenant-isolation test is the launch gate. No second tenant touches production until it's green.
