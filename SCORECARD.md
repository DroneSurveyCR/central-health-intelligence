# HealthSync Cloud — Production-Readiness Scorecard

Running score of the build toward production-grade per the PRD. Each area scored /10.
"Perfect" = all **buildable** software done + hardened; external items (BAAs, clinician sign-off,
live keys, dev-app approvals, legal) are tracked separately in ACTIVATION.md and capped out of this score.

**Updated:** Wave 5 start.

| # | Area | Score | Notes |
|---|------|:---:|-------|
| 1 | Multi-tenancy & isolation | 9 | RLS on all tables + tenant policies (static-verified). Runtime adversarial test = Wave 5. |
| 2 | Core EHR + module surfaces | 9 | Every module has a working, gated surface. |
| 3 | Clinical correctness | 4 | Strictly-safer guardrails in; deeper fixes (QTc-from-HR, PhenoAge unit conversion) + clinician sign-off pending. |
| 4 | Intelligence layer (Part 9) | 7 | Briefing/alerts/triage/desk/approvals built. AI draft *producers* + alert *delivery* missing. |
| 5 | Marketplace (Part 10) | 7 | Layer-1 (clinic menu + recommend + outcomes + course) built. |
| 6 | Patient experience | 8 | Connections/today/assistant/privacy built. Nudge *delivery* missing. |
| 7 | Connectors / sync engine | 4 | Engine + queue + sandbox proven; Oura scaffold. Real providers, **token encryption**, webhook verify, rate limits missing. |
| 8 | SaaS billing | 5 | Plan checkout + entitlement webhook (test-proven). Seats/proration/portal/setup-fee/tax missing. |
| 9 | Patient billing (Connect) | 7 | Per-tenant routing wired; activation-pending. |
| 10 | AI features | 7 | Assistant live + verified. Doctor-side draft producers missing. |
| 11 | Security & compliance | 5 | RLS good; **token plaintext**, audit WORM/retention, MFA enrollment, CSP-for-new-egress pending. |
| 12 | Automated testing | 0 | None. Wave 5. |
| 13 | Observability / ops | 1 | No monitoring, logging, CI/CD. |
| 14 | Onboarding / GTM surfaces | 5 | Basic onboarding; no subdomain routing, wizard depth, or marketing pages. |

**Buildable production-readiness: ~58/140 → target 130+/140** (the ~10 reserved for external-only items).

## Wave log
- **Waves 1–4 + AI:** intelligence layer, marketplace, patient experience, reports, export, session middleware, all modules, AI assistant activated. (Baseline above.)
- **Wave 5 (in progress):** token encryption, runtime isolation test, automated test suite, → re-score 1/7/11/12.
