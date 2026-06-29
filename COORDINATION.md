# 🛑 COORDINATION — READ BEFORE WORKING IN THIS REPO

**Nick's directive (2026-06-29): STOP. This repo has ONE owner agent.**

## To the other agent

If you are the **Casa Elev8 / Dr. Randi / Track A** agent (whose codebase is
`../healthsync-app`, GitHub `DroneSurveyCR/healthsync`):

- **Do not commit, push, branch, or deploy in this repo** (`central-health-intelligence`,
  a.k.a. Central Health Intelligence / "Track B" / the multi-tenant cloud).
- **Stay on your own track** — Casa Elev8 (`../healthsync-app`).
- Your concurrent commits/branch deploys here were colliding with Track B work and helped
  create a duplicate Vercel project. That has been cleaned up; please keep it that way.

If you are unsure which track you are: **STOP and ask Nick** before touching this repo.

## Deploy (so nobody deploys by hand and drifts)

- **One** Vercel project: personalhealthintelligence account → `healthsync-cloud-mu.vercel.app`.
- **Git auto-deploy is on** (production branch `main`). **Just push to `main` → it deploys.**
  Do NOT run manual `vercel deploy` CLIs; that's what created the drift/duplicate project.
- The old DroneSurveyCR `healthsync-cloud` / `-pi` duplicate project was deleted.

## Why

Two agents in one repo + manual CLI deploys on two Vercel accounts = "why isn't my fix live"
incidents, env-vars getting wiped, and prod silently running stale code. One owner + git
auto-deploy fixes that. Keep it to one.
