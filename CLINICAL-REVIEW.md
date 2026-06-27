# HealthSync Cloud — Clinical-Logic Safety Review

**Status:** ⛔ **Vertical modules are NOT cleared for live patient use until the CRITICAL items below are remediated and a licensed clinician signs off.**
**Method:** automated clinical-logic audit (code review against published references). This is an engineering safety pass to *accelerate* a clinician's sign-off — it is **not** a substitute for licensed clinical review.
**Date of audit:** this build.

This document is the punch-list a prescribing clinician + engineer work through together. Each finding has a sign-off box. "Applied" = a strictly-safer engineering guardrail has been committed (it can only *block more*, never *approve more*); the clinician still confirms the exact thresholds.

---

## Severity summary

| # | Module | Severity | One-line | Eng-fix applied? |
|---|--------|----------|----------|:---:|
| P1 | Peptide | 🔴 CRITICAL | No maximum-dose ceiling — `24 mg` or `1700 mg` GLP-1 accepted & stored | ✅ guard |
| P2 | Peptide | 🔴 CRITICAL | Negative/zero doses accepted (`Number.isFinite(-5)===true`) | ✅ guard |
| P3 | Peptide | 🟠 HIGH | Dose can jump straight to max, skipping titration; no confirm gate | ☐ clinician |
| P4 | Peptide | 🟠 HIGH | No MTC/MEN2/pregnancy contraindication gate before GLP-1 protocol/Rx | ☐ clinician |
| P5 | Peptide | 🟠 HIGH | Weekly-vs-daily frequency not modeled → possible 7× weekly overdose | ☐ clinician |
| K1 | KAP | 🔴 CRITICAL | Ibogaine gate compares **raw QT** to a **QTc** threshold; no sex/≥500 tier | ☐ clinician |
| K2 | KAP | 🔴 CRITICAL | Missing/blank QT **silently passes** ibogaine cardiac gate (fail-open) | ✅ fail-safe |
| K3 | KAP | 🔴 CRITICAL | Any unscored screening defaults to **"cleared"** (missing data = "fine") | ✅ fail-safe |
| K4 | KAP | 🔴 CRITICAL | QT-prolongation / arrhythmia history collected but never blocks | ☐ clinician |
| K5 | KAP | 🟠 HIGH | Ketamine contraindications (uncontrolled HTN, mania, pregnancy, ICP, recent MI) not blocking / not collected | ☐ clinician |
| K6 | KAP | 🟠 HIGH | Drug interactions (MAOI/SSRI/lithium/benzo/opioid) captured but not acted on | ☐ clinician |
| K7 | KAP | 🟠 HIGH | A "journey"/dosing session can be logged with **no/contraindicated** screening | ✅ gate |
| L1 | Longevity | 🔴 CRITICAL | **No unit conversion** — US lab values produce a 76-year error (42→118 yr) | ✅ conversion + guard |
| L2 | Longevity | 🔴 CRITICAL | Partial panels (4/9 markers) scored on full intercept → meaningless (−30 yr) | ✅ require 9 |
| L3 | Longevity | 🟠 HIGH | Age divisor typo `0.090165` should be `0.09165` | ✅ fixed |
| L4 | Longevity | 🟡 MED | Lymphocyte %-vs-absolute-count not distinguished | ☐ clinician |
| L5 | Longevity | 🟡 LOW | Biomarker range bounds not validated (optimal can mask out-of-ref) | ☐ |

---

## Peptide / GLP-1 (`app/api/peptide/*`, `lib/peptide/templates.ts`)

> Note: the static titration *tables* (semaglutide 0.25→0.5→1.0→1.7→2.4 mg / tirzepatide 2.5→…→15 mg, 4-week steps) are **clinically correct**. The defects are in the dose-handling code around them.

- **P1 🔴 No max-dose ceiling.** `route.ts` validates only `Number.isFinite()`. `24` mg (10× semaglutide max) or `1700` is accepted, stored, and redisplayed as authoritative. → **Fix:** per-compound `MAX_DOSE_MG` map; reject at API + DB CHECK. *(Eng guard applied; clinician confirms ceiling values.)*
- **P2 🔴 Negative/zero doses.** `Number.isFinite(-5)` and `(0)` are `true` → accepted. `0 mg` falsely documents care. → **Fix:** `x > 0` at client/API/DB. *(Applied.)*
- **P3 🟠 Titration skip.** PATCH writes any `current_dose_mg`/`current_week` with no schedule-consistency check and no prescriber confirm → can jump to top dose, skipping mandatory escalation (severe GI AE risk). → **Fix:** validate next dose against `titration_schedule` + elapsed weeks; require `override_reason` + `prescriber_id`. **Needs clinician.**
- **P4 🟠 No contraindication gate.** GLP-1 boxed warning (medullary thyroid carcinoma / MEN2) + pregnancy never checked. Generic intake "Thyroid Disorder" checkbox is not consulted. → **Fix:** require negative MTC/MEN2/pregnancy attestation before GLP-1 protocol/Rx. **Needs clinician.**
- **P5 🟠 Frequency not modeled.** No weekly/daily field; no interval guard → a weekly GLP-1 could be logged/instructed daily (7× exposure). → **Fix:** `frequency` column + administration-interval check. **Needs clinician.**

## Psychedelic / KAP (`app/api/psychedelic/screening/route.ts`, `session/route.ts`)

> All decision logic is in the **screening route** (`route.ts:66-80`). It is unsafe in the two worst ways: wrong-shaped thresholds and fail-open defaults.

- **K1 🔴 Raw QT vs QTc + wrong threshold.** `ecgQtMs > 450` compares **raw QT** (field `ecg_qt_ms`) to a **QTc** cutoff — clinically invalid both directions. No sex adjustment, no ≥500 ms contraindication tier. Ibogaine itself adds ~50 ms QTc. → **Fix:** capture HR/QTc, compute QTc, sex-specific flag (>450 M / >470 F), absolute block ≥500. **Needs clinician to confirm thresholds.**
- **K2 🔴 Blank QT passes.** `ecgQtMs != null && ecgQtMs > 450` — a missing ECG makes the clause `false` → ibogaine candidate with **no ECG** can be cleared. → **Fix:** ibogaine + null/non-finite QT = blocking, not pass. *(Fail-safe applied.)*
- **K3 🔴 Default "cleared".** Terminal `else → "cleared"`; `asBool()` coerces missing answers to `false` → empty/partial form = green "cleared" badge. → **Fix:** default `needs_review`; `cleared` only on complete, affirmative assessment + clinician confirm. *(Fail-safe applied: never emit "cleared" on incomplete data.)*
- **K4 🔴 Collected-but-ignored.** `ibo_qt_prolongation` + `cv_arrhythmia` only → "conditional" for ibogaine; should be absolute. → **Fix:** add to `absolute` set. **Needs clinician.**
- **K5 🟠 Ketamine contraindications.** Uncontrolled HTN/pregnancy/active-mania only conditional; recent MI, raised ICP/IOP **not collected at all**. → **Fix:** add fields; promote to blocking. **Needs clinician.**
- **K6 🟠 Interactions inert.** MAOI/SSRI/lithium/benzo captured but not substance-aware; opioids + QT-drugs not collected. → **Fix:** substance-aware interaction rules. **Needs clinician.**
- **K7 🟠 Session not gated on screening.** `session/route.ts` never reads `psychedelic_screenings`; a "journey" can be logged for a `contraindicated`/unscreened patient. → **Fix:** block journey logging without a current cleared screening for that substance. *(Gate applied.)*

## Longevity / PhenoAge (`lib/longevity/biological-age.ts`, `lib/biomarker/ranges.ts`)

> The Levine-2018 coefficients, gamma `0.0076927`, `t=120` months, Gompertz mortality expression, and CRP handling are **correct**. Three defects make output untrustworthy.

- **L1 🔴 No unit conversion.** Formula expects SI (albumin g/L, creatinine µmol/L, glucose mmol/L); panel stores the unit as ignored free text. US-conventional values entered raw → demonstrated **42 → 118 year** error. → **Fix:** convert by unit (albumin g/dL×10, creatinine mg/dL×88.42, glucose mg/dL÷18); reject unknown units. *(Applied: conversion layer + unknown-unit refusal.)*
- **L2 🔴 Partial-panel scoring.** Admits ≥4/9 markers but keeps the full-model intercept → result depends on *which* markers are missing (−30 yr seen). → **Fix:** require all 9 markers + age or refuse. *(Applied.)*
- **L3 🟠 Divisor typo.** `…/ 0.090165` should be `0.09165` (the code comment even says `0.09165`). → **Fix:** one-char correction. *(Applied.)*
- **L4 🟡 Lymphocyte unit.** Bare `lymphocyte` aliased to `lymphocyte_pct`; an absolute count (~2.0) read as "2%". → **Fix:** distinguish %/absolute. **Needs clinician.**
- **L5 🟡 Range bounds.** No validation `low ≤ high` or optimal⊆reference → inverted/oversized bounds accepted silently. → **Fix:** validate bounds.

---

## Clinician sign-off

I, the supervising clinician, have reviewed the findings above and confirm the threshold values, contraindication lists, and gating behavior are correct for live use:

- [ ] Peptide module — dosing ceilings, titration rules, contraindication gate confirmed
- [ ] KAP module — QTc thresholds, contraindication & interaction lists, session gating confirmed
- [ ] Longevity module — unit handling and required-marker policy confirmed

Name / license / date: ________________________
