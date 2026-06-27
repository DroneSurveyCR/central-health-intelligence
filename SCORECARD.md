# HealthSync Cloud — Production-Readiness Scorecard

Running score of the build toward production-grade per the PRD. Each area scored /10.
"Perfect" = all **buildable** software done + hardened; external items (BAAs, clinician sign-off,
live keys, dev-app approvals, legal) are tracked separately in ACTIVATION.md and capped out of this score.

**Updated:** Wave 5 complete.

| # | Area | Score | Notes |
|---|------|:---:|-------|
| 1 | Multi-tenancy & isolation | **10** | RLS + tenant policies; **runtime adversarial test passes — 0 leaks across 18 tables** (`scripts/test-isolation-full.mjs`). |
| 2 | Core EHR + module surfaces | 9 | Every module has a working, gated surface. |
| 3 | Clinical correctness | **7** | QTc now computed (Bazett, sex thresholds); PhenoAge converts US→SI units; guardrails unit-tested. Clinician sign-off still required. |
| 4 | Intelligence layer (Part 9) | **8** | Briefing/alerts/triage/desk/approvals + **AI draft producers (SOAP/reply/narrative, verified)** + **notification delivery** + alert-fatigue tuning. |
| 5 | Marketplace (Part 10) | 7 | Layer-1 (clinic menu + recommend + outcomes + course) built. |
| 6 | Patient experience | **9** | Connections/today/assistant/privacy + **patient notification delivery** (`/updates`: milestones + appointment reminders, deduped) + nav bell. |
| 7 | Connectors / sync engine | **7** | Engine + queue + encrypted tokens; **Withings/Dexcom/Garmin providers + webhook HMAC verify + per-connector rate limiting**. Activation needs provider dev-app creds (Garmin=OAuth1 caveat). |
| 8 | SaaS billing | **8** | Plan checkout + entitlement + **per-provider seats + Stripe customer portal + one-time HIPAA setup fee + Stripe Tax**. Proration/cancel via portal. |
| 9 | Patient billing (Connect) | 7 | Per-tenant routing wired; activation-pending. |
| 10 | AI features | **9** | Assistant + **doctor-side draft producers (SOAP/message-reply/narrative)** all live + verified end-to-end. |
| 11 | Security & compliance | **9** | RLS proven; tokens encrypted; **MFA (TOTP) enrollment + /mfa step-up**; **audit-log WORM (append-only, verified)** + 6yr-retention doc. Pen-test/full-CSP-audit pending. |
| 12 | Automated testing | **7** | 79 unit tests (guardrails, PhenoAge, billing, modules, state, safety, observability, crypto, ratelimit) + runtime isolation script. Route/e2e still light. |
| 13 | Observability / ops | **5** | Structured logger + `captureError` (Sentry-DSN-gated) + `/api/health` (verified) + error-boundary capture + GitHub Actions CI. Real Sentry/uptime account = external. |
| 14 | Onboarding / GTM surfaces | **8** | 4-step onboarding wizard (vertical→modules) + per-clinic public pages (`/p/[slug]`) + host-rewrite scaffold. Real subdomains need Vercel wildcard config (external). |

**Buildable production-readiness: 78 → 90 → 96 → 105 → 110/140** (target ~118-120 buildable ceiling; the rest is external-only: clinician sign-off, BAAs, live keys, dev-app approvals, real Sentry/uptime, legal).

## Wave log
- **Waves 1–4 + AI:** intelligence layer, marketplace, patient experience, reports, export, session middleware, all modules, AI assistant activated. (Baseline 78.)
- **Wave 5 ✅ (Tier 1 hardening):** AES-256-GCM token encryption (sync regression-tested), runtime tenant-isolation test (0 leaks/18 tables), vitest suite (59 tests), QTc-from-HR + PhenoAge unit conversion. Score 78→90. Areas 1/3/7/11/12 up.
- **Wave 6 ✅ (Tier 2a):** billing depth (seats + Stripe portal + HIPAA setup fee + Stripe Tax), AI draft producers (SOAP/reply/narrative — verified end-to-end), notifications + alert delivery + fatigue tuning. Migrations 010/011. Score 90→96. Areas 4/8/10 up.
- **Wave 7 ✅ (Tier 2b/3):** Withings/Dexcom/Garmin providers + webhook HMAC + rate limiting; observability (logger/captureError/health/CI); MFA enrollment + /mfa; audit WORM (migration 012, verified). Score 96→104. Areas 7/11/13 up.
- **Wave 8 ✅:** per-clinic public pages (`/p/[slug]`) + host-rewrite + 4-step onboarding wizard; patient notification delivery (`/updates`); +14 tests (79 total). Score 105→110. Areas 6/12/14 up. (Fixed a route-group collision: patient notifications → `/updates`.)
- **Approaching the buildable ceiling (~118-120).** Remaining points are increasingly EXTERNAL-gated: clinical correctness (clinician sign-off), connectors (dev-app creds), patient billing (Connect enable), observability (Sentry/uptime account), marketplace Layer-2 (post-PMF by design). **Wave 9 (final buildable):** route/e2e tests + a couple of deep-polish items, then the score is external-bound.
