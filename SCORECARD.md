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
| 4 | Intelligence layer (Part 9) | 7 | Briefing/alerts/triage/desk/approvals built. AI draft *producers* + alert *delivery* missing. |
| 5 | Marketplace (Part 10) | 7 | Layer-1 (clinic menu + recommend + outcomes + course) built. |
| 6 | Patient experience | 8 | Connections/today/assistant/privacy built. Nudge *delivery* missing. |
| 7 | Connectors / sync engine | **5** | Engine + queue + sandbox proven; **tokens now AES-256-GCM encrypted**. Real providers, webhook verify, rate limits missing. |
| 8 | SaaS billing | 5 | Plan checkout + entitlement webhook (test-proven). Seats/proration/portal/setup-fee/tax missing. |
| 9 | Patient billing (Connect) | 7 | Per-tenant routing wired; activation-pending. |
| 10 | AI features | 7 | Assistant live + verified. Doctor-side draft producers missing. |
| 11 | Security & compliance | **7** | RLS proven; **tokens encrypted**; tests lock guardrails. MFA enrollment, audit WORM/retention, CSP-for-egress pending. |
| 12 | Automated testing | **5** | 59 unit tests (dose guards, PhenoAge, billing, modules, state, safety) + runtime isolation script. No route/e2e/CI yet. |
| 13 | Observability / ops | 1 | No monitoring, logging, CI/CD. |
| 14 | Onboarding / GTM surfaces | 5 | Basic onboarding; no subdomain routing, wizard depth, or marketing pages. |

**Buildable production-readiness: 78 → 90/140** (target 130+; ~10 reserved for external-only items).

## Wave log
- **Waves 1–4 + AI:** intelligence layer, marketplace, patient experience, reports, export, session middleware, all modules, AI assistant activated. (Baseline 78.)
- **Wave 5 ✅ (Tier 1 hardening):** AES-256-GCM token encryption (sync regression-tested), runtime tenant-isolation test (0 leaks/18 tables), vitest suite (59 tests), QTc-from-HR + PhenoAge unit conversion. Score 78→90. Areas 1/3/7/11/12 up.
- **Wave 6 (next, Tier 2a):** billing depth (seats/proration/portal/setup-fee/Stripe Tax) + AI draft producers (voice→SOAP, scan synthesis, message-reply, superbill) + alert/nudge delivery. Targets 4/6/8/10.
