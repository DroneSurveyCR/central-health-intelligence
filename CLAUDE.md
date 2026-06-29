# HealthSync Cloud — CLAUDE.md

> 🛑 **TRACK BOUNDARY (Nick's directive, 2026-06-29) — ONE agent, ONE track.**
>
> **This repo = Central Health Intelligence, the multi-tenant SaaS CLOUD (Track B).** The agent
> who works here is the **Cloud / SaaS agent** and works ONLY here:
> - Repo `DroneSurveyCR/central-health-intelligence` (local `healthsync-cloud`)
> - Deploy: ONE Vercel project, **personalhealthintelligence** account → `healthsync-cloud-mu.vercel.app`
>   (git auto-deploy from `main` — just push; never manual `vercel deploy`)
>
> ⛔ The Cloud agent **never touches Casa Elev8 (Track A)**: not the `DroneSurveyCR/healthsync`
> repo / `../healthsync-app`, not `my.elev8.health`, not the `healthsync-app` Vercel project.
>
> ⛔ If you are the **Casa Elev8 / Track A** agent, you are in the WRONG repo — **do NOT commit,
> push, or deploy here.** Go back to `../healthsync-app`.
>
> Two agents in one repo + manual CLI deploys caused collisions, wiped env vars, and a duplicate
> Vercel project. If you're EVER unsure which track a task is, STOP and ask Nick. See `COORDINATION.md`.

> **Read `STATUS.md` first, every session.** It is the single source of truth.

## What this is
HealthSync Cloud = the **multi-tenant SaaS we sell** ("Personal Health Intelligence").
One product codebase + one database; each clinic enables only the modules they buy
(`practices.modules` + `requireModule` gating). This is the thing under active build.

**NOT this repo's job:** Dr. Randi's Casa Elev8 app (`../healthsync-app`). That is a
**separate, minimal, near-launch single-tenant app** — its own repo + Supabase project.
Keep it minimal; do NOT build product modules into it. Port a module to her *selectively*
only after it's proven here. (See memory `healthsync-two-track-strategy`.)

## Operating principles (Karpathy-lean — follow strictly)
1. **Minimum scope.** Build only what's needed to ship the next checkpoint. Nothing speculative.
2. **Verifiable success criteria.** Every phase has a checkpoint that must pass before moving on.
3. **Surgical changes.** Small, targeted diffs. No sprawling rewrites.
4. **No speculation.** Don't add modules/abstractions "for later." Park ideas in `BACKLOG.md`.
5. **One thing at a time.** Finish + verify + commit a slice before starting the next.
6. **STATUS.md is the truth.** Update it after every task (Last Action + Next Action minimum).

> Anti-pattern that already happened once: building 9 modules speculatively into the wrong
> repo. Don't repeat it. Lean, verifiable, in the right place.

## Facts
- **Cloud DB:** Supabase `aezudceznxclvexfpdvr` (region us-east-1), under the
  **personalhealthintelligence@gmail.com** account. Tenancy done; tenant-isolation gate PASSES.
- **Tenant #1:** Casa Elev8 (Randi) ETL'd in as practice `11111111-1111-1111-1111-111111111111` (test/real data).
- **Provisioning toolchain (this repo, `scripts/`):** provision, clone-schema, grants, dest-prep,
  apply-migrations, cloud-module-tenancy, etl-casa-elev8, test-tenant-isolation. Run via `--env-file=.env`.
- **Module code** (psychedelic, peptide, biomarker, nutrition, longevity, wearables, AI drafts) is
  parked on the `modules-for-cloud` branch in `../healthsync-app` — port leanly, per phase, WITH gating.
- **Secrets** live in `.env` (gitignored). The `sbp_` management token should be rotated post-build.

## Workflow
- Work the current phase in `PHASES/phase-NN.md`; don't exceed its scope.
- Pass `CHECKPOINTS/cp-NN.md` before merging/moving on.
- Scope creep → `BACKLOG.md`. Decisions → `DECISIONS/`.
- Commit with the task in the message. Never deploy/push without explicit go-ahead.
