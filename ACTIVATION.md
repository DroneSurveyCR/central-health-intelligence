# HealthSync Cloud — Activation Checklist

The product is **built and deployed**. What remains to reach full production is **external** —
credentials, paperwork, and a clinician sign-off — none of which can be done in code. Each item
below is wired and degrades gracefully until you supply the input, then activates with no code change.

Live: **https://healthsync-cloud-mu.vercel.app** · super-admin: `personalhealthintelligence@gmail.com`

## 1. Clinical sign-off (BLOCKS live patient use of clinical modules)
- A licensed clinician must review + sign **`CLINICAL-REVIEW.md`**. Strictly-safer engineering guardrails
  are committed (dose ceilings/positivity, KAP fail-safe + session gating, PhenoAge unit/require-9/divisor,
  HRT dose guards), but the exact thresholds and contraindication lists need clinical confirmation.
- Affects: peptide, psychedelic/KAP, longevity, hrt.

## 2. HIPAA BAAs (BLOCKS US PHI revenue)
- Sign BAAs with **Supabase, Vercel, Resend, the LLM vendor (Anthropic), Twilio**. Until then, sell **non-US** only
  (the plan's KAP/Canada wedge is designed for exactly this).

## 3. SaaS billing → LIVE (currently Stripe TEST mode)
- Swap to the **personalhealthintelligence** Stripe account's LIVE keys: set `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, and re-run `node scripts/setup-stripe.mjs` (then `setup-stripe-finish.mjs`) to create
  live products/prices + webhook; set the three `STRIPE_PRICE_*`. Proven end-to-end in test mode (webhook flips plan→modules).

## 4. Patient billing via Stripe Connect (per-tenant)
- Enable **Connect** in the platform Stripe dashboard → set `STRIPE_CONNECT_CLIENT_ID` (`ca_…`) → register a
  Connect webhook → set `STRIPE_CONNECT_WEBHOOK_SECRET`. Then each clinic connects their OWN Stripe at
  `/settings/payments` and patient invoice payments route to the clinic's account (0% platform fee, configurable
  via `STRIPE_APPLICATION_FEE_BPS`).

## 5. Wearable OAuth (real-time connector sync)
- Submit **Oura/Withings/Dexcom/Garmin** developer-app applications (weeks of lead time). Set `OURA_CLIENT_ID` +
  `OURA_CLIENT_SECRET` to activate Oura. The sync engine + job queue + cron are built and **proven end-to-end via
  the sandbox provider** (90-day backfill → normalized tenant-scoped rows). Patients self-connect at `/connections`.

## 6. AI features (assistant + AI drafts)
- Set `ANTHROPIC_API_KEY` (a **BAA / zero-retention** endpoint for the PRODUCT — distinct from any personal Max plan).
  Patient `/assistant` (grounded + safety-gated) and the `ai_drafts`→`/approvals` loop activate; both degrade to
  non-AI grounded/empty states without it.

## 7. Comms
- **Email:** verify a Resend domain → set `RESEND_FROM` (patient reminders, invites). **SMS:** Twilio 10DLC/A2P registration.

## 8. Legal stack
- ToS, master BAA, DPA, SCCs, per-vertical consent/liability (psychedelic + peptide + HRT carry real medico-legal risk).

## Remaining software (minor, non-blocking)
- **multisite**: locations exist in settings; full per-location data scoping is a deeper build, deferred.
- Re-invite real Casa Elev8 staff if more are added (script: `scripts/reinvite-staff.mjs`; currently only Randi exists).

## Env var summary (set in Vercel → redeploy)
```
# billing (live)
STRIPE_SECRET_KEY= STRIPE_WEBHOOK_SECRET= STRIPE_PRICE_STARTER= STRIPE_PRICE_GROWTH= STRIPE_PRICE_NETWORK=
# patient billing
STRIPE_CONNECT_CLIENT_ID= STRIPE_CONNECT_WEBHOOK_SECRET= STRIPE_APPLICATION_FEE_BPS=0
# wearables
OURA_CLIENT_ID= OURA_CLIENT_SECRET=
# AI + comms
ANTHROPIC_API_KEY= RESEND_FROM= NEXT_PUBLIC_APP_URL=https://healthsync-cloud-mu.vercel.app
```
