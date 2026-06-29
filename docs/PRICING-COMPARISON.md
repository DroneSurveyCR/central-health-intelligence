# Central Health Intelligence — Pricing & Competitive Comparison

**Product:** Central Health Intelligence (CHI)
**Company:** Health Intelligency

This document captures the market pricing models for clinical software, a competitive comparison, and CHI's own positioning and pricing. Figures for competitors are publicly cited ranges drawn from general industry SaaS pricing surveys and vendor materials; they vary by plan, term, practice size and add-ons, and should be treated as directional rather than exact.

---

## 1. Market pricing models

Clinical software (EHR / practice management) is overwhelmingly sold on a **per-provider, per-month** basis, with significant one-time and services fees layered on top.

| Component | Typical market range | Notes |
| --- | --- | --- |
| Per-provider subscription | **$200–800 / provider / mo** | SaaS EHR + practice-management seats; lower for solo-focused tools, higher for full RCM and enterprise. |
| Implementation / setup | **$5,000–100,000** | Configuration, training, go-live. Scales sharply with practice size and product complexity. |
| Data migration | **$2,000–50,000** | Importing legacy records; priced by record volume, source system and cleanliness. |
| Enterprise implementation (Epic / Oracle Health) | **12–24-month projects** | Large multi-year deployments with dedicated teams; pricing is bespoke and not publicly listed. |

**Takeaways**
- The dominant unit of pricing is the **provider seat per month**.
- Onboarding and migration are where budgets balloon — often dwarfing year-one subscription cost.
- Enterprise systems trade speed for breadth: multi-quarter to multi-year implementations are normal.
- Most products are storage-first systems of record. Live device data, doctor-in-the-loop AI, and patient-owned data layers are generally **not** part of the core offering.

---

## 2. Competitive comparison

| Product | Segment | What they do | Price (publicly cited ranges) | vs CHI |
| --- | --- | --- | --- | --- |
| **Kareo / Tebra** | Small–mid practices | Practice management + EHR + billing | ~$200–400 / provider / mo | Storage-first PM/EHR. No live wearable/CGM data, no doctor-in-the-loop AI, no patient-owned layer. |
| **DrChrono** | Small–mid practices | EHR + practice management, iPad-first | ~$199–399 / provider / mo | Modern UI but record-keeping core; no live-data + AI synthesis, no patient data ownership. |
| **CareCloud** | Mid-market | EHR + revenue-cycle management | ~$250–450 / provider / mo | RCM-led; designed around billing throughput, not live clinical intelligence. |
| **SimplePractice** | Solo / small practice (wellness, behavioral) | Lightweight EHR + scheduling + telehealth | ~$29–99 / mo (solo) | Affordable and simple, but a records/admin tool — no connector engine, no AI layer, no patient-owned data. |
| **Epic** | Enterprise / health systems | Full enterprise EHR | Enterprise; 12–24-month implementation | Comprehensive but heavy and slow to deploy; not built for small integrative/longevity clinics or live consumer-device data. |
| **athenahealth** | Mid-market / networked practices | Cloud EHR + RCM + patient engagement | ~$140–500+ / provider / mo (often % of collections) | Network-scale and RCM-strong; still a system of record without live-data + doctor-in-the-loop AI or a patient-owned layer. |

*All competitor figures are directional ranges from general industry SaaS pricing surveys and public vendor materials; actual pricing depends on plan, contract term, practice size and add-ons.*

---

## 3. CHI positioning & pricing

### The wedge
Central Health Intelligence is built for the clinics the big EHRs overlook — **integrative, longevity, functional-medicine, peptide, HRT and plant-medicine / KAP** practices. The differentiator is three things legacy systems don't combine:

1. **Live data** — wearables, CGM, scales and labs sync continuously into one normalized patient picture.
2. **Doctor-in-the-loop AI** — AI drafts notes, briefings and talking points from the live data; the doctor always approves. Nothing is auto-applied.
3. **Patient-owned layer** — patients connect their own devices and can export a full, portable copy of their record on request.

We price like a legacy EHR (per provider) so the buying decision is at parity — but the product delivers a live picture and an AI layer they can't.

### Pricing model
- **Per-provider monthly plan** that includes the always-on platform: EHR core, scheduling, billing, patient portal, engagement, the intelligence / AI layer, and the connector engine.
  - **Solo** — one provider.
  - **Clinic** — multiple providers, billed per seat, with volume pricing as seats grow.
- **Module add-ons** (per provider, per month) — land-and-expand:

  | Module | Price / mo |
  | --- | --- |
  | Labs | $39 |
  | Wearables / CGM | $49 |
  | Peptide / KAP / HRT | $79 |
  | Longevity | $49 |
  | Nutrition | $39 |
  | e-Prescribing | $49 |
  | Telehealth | $49 |
  | Dispensary | $39 |
  | Reports | $29 |
  | Marketplace | $49 |
  | Multi-site | $99 |

- **One-time HIPAA-compliance setup fee — $2,000–5,000** — covering compliant provisioning, BAA, data migration and white-glove onboarding. Deliberately a fraction of the $5k–100k setup and $2k–50k migration fees common in the market.

### Three editions
1. **Cloud** — shared multi-tenant cloud. Fastest and most affordable; live in days. Best for clinics outside the US PHI regime.
2. **HIPAA Cloud** — managed compliant tier with signed BAAs and US-PHI-ready controls. The default for US clinics handling protected health information.
3. **Private Cloud** — a dedicated, isolated instance on the clinic's own VPS. White-label and enterprise, with full data-residency control.

### Why we win
- **Speed:** live in days, not the 12–24-month implementations enterprise EHRs require.
- **Price parity, more value:** per-provider pricing matches legacy EHRs, plus a live-data and AI layer they lack.
- **Honest, modular cost:** a low setup fee and pay-for-what-you-run modules instead of $5k–100k onboarding and opaque enterprise contracts.
- **Right-fit:** purpose-built for integrative / longevity / functional / peptide / HRT / KAP clinics that mainstream EHRs serve poorly.

---

*Sources: pricing figures are directional ranges compiled from general industry SaaS / EHR pricing surveys and publicly available vendor information. They are provided for orientation and should be verified against current vendor quotes for any specific clinic.*
