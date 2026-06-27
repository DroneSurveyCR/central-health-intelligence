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
| 6 | Patient experience | 8 | Connections/today/assistant/privacy built. Nudge *delivery* missing. |
| 7 | Connectors / sync engine | **7** | Engine + queue + encrypted tokens; **Withings/Dexcom/Garmin providers + webhook HMAC verify + per-connector rate limiting**. Activation needs provider dev-app creds (Garmin=OAuth1 caveat). |
| 8 | SaaS billing | **8** | Plan checkout + entitlement + **per-provider seats + Stripe customer portal + one-time HIPAA setup fee + Stripe Tax**. Proration/cancel via portal. |
| 9 | Patient billing (Connect) | 7 | Per-tenant routing wired; activation-pending. |
| 10 | AI features | **9** | Assistant + **doctor-side draft producers (SOAP/message-reply/narrative)** all live + verified end-to-end. |
| 11 | Security & compliance | **9** | RLS proven; tokens encrypted; **MFA (TOTP) enrollment + /mfa step-up**; **audit-log WORM (append-only, verified)** + 6yr-retention doc. Pen-test/full-CSP-audit pending. |
| 12 | Automated testing | **6** | 65 unit tests (guardrails, PhenoAge, billing, modules, state, safety, observability) + runtime isolation script. Route/e2e still light. |
| 13 | Observability / ops | **5** | Structured logger + `captureError` (Sentry-DSN-gated) + `/api/health` (verified) + error-boundary capture + GitHub Actions CI. Real Sentry/uptime account = external. |
| 14 | Onboarding / GTM surfaces | 5 | Basic onboarding; no subdomain routing, wizard depth, or marketing pages. |

**Buildable production-readiness: 78 → 90 → 96 → 104/140** (target 130+; ~10 reserved for external-only items).

## Wave log
- **Waves 1–4 + AI:** intelligence layer, marketplace, patient experience, reports, export, session middleware, all modules, AI assistant activated. (Baseline 78.)
- **Wave 5 ✅ (Tier 1 hardening):** AES-256-GCM token encryption (sync regression-tested), runtime tenant-isolation test (0 leaks/18 tables), vitest suite (59 tests), QTc-from-HR + PhenoAge unit conversion. Score 78→90. Areas 1/3/7/11/12 up.
- **Wave 6 ✅ (Tier 2a):** billing depth (seats + Stripe portal + HIPAA setup fee + Stripe Tax), AI draft producers (SOAP/reply/narrative — verified end-to-end), notifications + alert delivery + fatigue tuning. Migrations 010/011. Score 90→96. Areas 4/8/10 up.
- **Wave 7 ✅ (Tier 2b/3):** Withings/Dexcom/Garmin providers + webhook HMAC + rate limiting; observability (logger/captureError/health/CI); MFA enrollment + /mfa; audit WORM (migration 012, verified). Score 96→104. Areas 7/11/13 up.
- **Wave 8 (next):** subdomain/custom-domain routing + onboarding wizard depth + per-clinic public pages (→14); patient notification/nudge delivery (→6); broader route/integration tests (→12). Then re-score toward the 130 target.
