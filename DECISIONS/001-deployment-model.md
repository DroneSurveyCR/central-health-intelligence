# ADR 001 — Deployment model: pooled now, dedicated/self-hosted on demand

**Status:** Accepted
**Date:** this session

## Context
Some clinics (HIPAA / data-sovereignty) will want a dedicated or self-hosted instance —
their own database, possibly on their own VPS. Question: build that now or later?

## Decision
**Ship pooled (shared-schema) Cloud first. Offer dedicated/self-hosted as an enterprise tier
built ON DEMAND when a real client signs — not speculatively.**

Three deployment modes, ONE env-driven codebase:
1. **Pooled (default):** all clinics share the one Cloud Supabase project; isolation by
   `practice_id` + RLS. 95% of customers. This is what we're shipping.
2. **Dedicated (managed):** same app pointed at the client's own Supabase project (we operate it).
3. **Self-hosted:** the client runs **self-hosted Supabase** (Postgres + GoTrue auth + Storage +
   API — the open-source Docker stack) on their own VPS. Full sovereignty.

Key facts that make this cheap to defer:
- The app reads its DB from env vars → a dedicated instance is a config change, not a fork.
- The multi-tenant schema works fine for a single tenant (one `practices` row) — it's a superset.
- Our migrations/RLS are standard Postgres + Supabase-auth functions → they port to self-hosted
  Supabase unchanged.
- The provisioning toolchain (`scripts/provision`, `migrate`, `clone-schema`, isolation test)
  already targets any project → per-instance spin-up is a runbook, not new code.
- "Their own Postgres" must mean **self-hosted Supabase**, NOT bare Postgres — the app depends on
  Supabase Auth (`auth.uid()`, the basis of RLS) and Storage. Bare Postgres would require replacing
  the auth + storage layers (a much bigger lift) — don't offer that.

## Consequences
- **Now:** one product, one deployment. Fast iteration, instant onboarding (insert a row).
- **Rule (free, do now):** keep the codebase **deployment-agnostic** — no hardcoded
  "the shared instance" assumptions. Already true; keep it true.
- **On signed demand:** write the "spin up a dedicated/self-hosted instance" runbook + script.
- HIPAA is broader than the DB: app host, email, LLM, error logging each need a BAA or a
  self-hosted equivalent, plus a signed BAA. Scope per client when the deal is real.

## Rejected
- Building the dedicated/self-hosted mode now → speculative ops complexity (second deploy to
  maintain, version-drift risk) with no customer. Violates minimum-scope.
