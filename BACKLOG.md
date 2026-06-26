# HealthSync Cloud — Backlog

Out-of-scope ideas parked so they don't pollute the current phase. Pull into a phase only when
there's a concrete reason (a signed customer, a real need). See `CLAUDE.md` for the lean rules.

## Enterprise / deployment
- **Dedicated / self-hosted HIPAA tier** — build the "spin up a dedicated instance" runbook +
  script (self-hosted Supabase on a client VPS) ON DEMAND when a HIPAA client signs. Architecture
  already supports it (env-driven app + portable migrations + provisioning toolchain). See
  `DECISIONS/001-deployment-model.md`. Rule meanwhile: keep code deployment-agnostic.
- **Subdomain / custom-domain routing** — resolve a practice from `*.healthsync.app` / custom
  domain so public (anon) pages work per-tenant. Needed before public marketing/booking pages.

## Security / correctness (do before scaling customers)
- **Connector/import gating** — connectors use the admin client (bypass RLS); the import/parse/
  confirm routes must call `requireModule()` for the connector's owning module. Load-bearing.
- **Clinical-logic review** — dosing calculator, contraindication screening, PhenoAge math, etc.
  were agent-built + compile-clean but need a human/clinical correctness review before patient use.
- **MFA on API routes** — API routes use `getCurrentPractitioner()` (no AAL2 step-up). Add a
  shared `requireStaffApi()` that enforces MFA, app-wide.
- **Audit triggers** — re-implement audit logging to set `practice_id` (currently disabled in Cloud).

## Product (post first-customers)
- Module-management UI (admin toggles a practice's modules on/off).
- Stripe subscription billing + the setup-fee/founding-customer flow.
- Wearable OAuth connectors (need provider dev-app approvals).
- Patient-experience depth (engagement, /assistant), modality marketplace, HRT/dispensary/telehealth.

## Ops / compliance (before US PHI)
- BAAs (Supabase, Vercel, Resend, LLM), Twilio 10DLC, email domain auth, DR/backup policy, ToS/DPA.
