/**
 * Longevity / Biological Age estimation.
 *
 * Implements a simplified PhenoAge-style estimate based on Levine et al. (2018),
 * "An epigenetic biomarker of aging for lifespan and healthspan" (Aging),
 * which defines the clinical "Phenotypic Age" from 9 blood markers + chronological age.
 *
 * NOTE: The coefficients below are the published Levine PhenoAge linear-combination
 * weights, with unit conversions applied to the input units this module expects.
 * They should be VALIDATED against a reference implementation before clinical use —
 * lab unit conventions vary and small coefficient/units mismatches shift results.
 *
 * All functions are pure.
 */

export type BioMarker = { name: string; value: number };

/**
 * Canonical marker keys this module understands, with the input units assumed.
 *   albumin        g/L
 *   creatinine     umol/L
 *   glucose        mmol/L
 *   crp            mg/L
 *   lymphocyte_pct %
 *   mcv            fL
 *   rdw            %
 *   alk_phos       U/L
 *   wbc            1000/uL (i.e. 10^3 cells/uL)
 */
const CANONICAL_KEYS = [
  "albumin",
  "creatinine",
  "glucose",
  "crp",
  "lymphocyte_pct",
  "mcv",
  "rdw",
  "alk_phos",
  "wbc",
] as const;

type CanonicalKey = (typeof CANONICAL_KEYS)[number];

/**
 * Map common lab synonyms / spellings onto our canonical keys. Names are first
 * normalized (lowercase, spaces & hyphens -> underscore) before lookup here.
 */
const ALIASES: Record<string, CanonicalKey> = {
  albumin: "albumin",
  alb: "albumin",
  creatinine: "creatinine",
  creat: "creatinine",
  crea: "creatinine",
  glucose: "glucose",
  glu: "glucose",
  fasting_glucose: "glucose",
  crp: "crp",
  hs_crp: "crp",
  hscrp: "crp",
  c_reactive_protein: "crp",
  lymphocyte_pct: "lymphocyte_pct",
  lymphocytes_pct: "lymphocyte_pct",
  lymphocyte_percent: "lymphocyte_pct",
  lymph_pct: "lymphocyte_pct",
  lymphocyte: "lymphocyte_pct",
  lymphocytes: "lymphocyte_pct",
  mcv: "mcv",
  mean_corpuscular_volume: "mcv",
  rdw: "rdw",
  red_cell_distribution_width: "rdw",
  alk_phos: "alk_phos",
  alkaline_phosphatase: "alk_phos",
  alp: "alk_phos",
  alkphos: "alk_phos",
  wbc: "wbc",
  white_blood_cells: "wbc",
  white_blood_cell_count: "wbc",
  leukocytes: "wbc",
  leukocyte_count: "wbc",
};

/** Normalize a free-text marker name to a lookup token. */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Normalize an array of panel markers into a map keyed by canonical marker name.
 * Unrecognized markers are dropped. Non-finite values are skipped.
 */
export function extractMarkerMap(
  panelMarkers: { name: string; value: number }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of panelMarkers ?? []) {
    if (!m || typeof m.name !== "string") continue;
    const token = normalizeName(m.name);
    const key = ALIASES[token];
    if (!key) continue;
    const value = Number(m.value);
    if (!Number.isFinite(value)) continue;
    // First occurrence wins (panels are typically ordered most-relevant first).
    if (!(key in out)) out[key] = value;
  }
  return out;
}

/** Case-insensitive lookup of a canonical key in an arbitrary marker map. */
function pick(
  markers: Record<string, number>,
  key: CanonicalKey,
): number | null {
  // Fast path: exact key.
  if (key in markers && Number.isFinite(markers[key])) return markers[key];
  // Fallback: normalize every provided key and match.
  for (const k of Object.keys(markers)) {
    const token = normalizeName(k);
    if (ALIASES[token] === key && Number.isFinite(markers[k]))
      return markers[k];
  }
  return null;
}

/**
 * Simplified PhenoAge estimate.
 *
 * Returns a biological-age estimate (years, 1 decimal) or null when fewer than
 * 4 of the supported markers are available.
 *
 * Math follows the Levine PhenoAge formulation:
 *   1. xb = b0 + sum(coef_i * marker_i) + coef_age * chronoAge   (linear predictor)
 *   2. M  = 1 - exp( -exp(xb) * (exp(g * t) - 1) / g )           (10-yr mortality, t=120 months)
 *   3. PhenoAge = 141.50 + ln(-0.00553 * ln(1 - M)) / 0.09165    (age conversion)
 *
 * Coefficients are the published per-unit weights, adjusted for this module's
 * input units. VALIDATE before clinical use.
 */
export function phenoAge(
  markers: Record<string, number>,
  chronoAge: number,
): number | null {
  const albumin = pick(markers, "albumin"); // g/L
  const creatinine = pick(markers, "creatinine"); // umol/L
  const glucose = pick(markers, "glucose"); // mmol/L
  const crp = pick(markers, "crp"); // mg/L
  const lymphocytePct = pick(markers, "lymphocyte_pct"); // %
  const mcv = pick(markers, "mcv"); // fL
  const rdw = pick(markers, "rdw"); // %
  const alkPhos = pick(markers, "alk_phos"); // U/L
  const wbc = pick(markers, "wbc"); // 1000/uL

  const present = [
    albumin,
    creatinine,
    glucose,
    crp,
    lymphocytePct,
    mcv,
    rdw,
    alkPhos,
    wbc,
  ].filter((v): v is number => v != null);

  if (present.length < 4) return null;
  if (!Number.isFinite(chronoAge) || chronoAge <= 0) return null;

  // Published Levine PhenoAge coefficients (per the original Aging 2018 paper).
  // These weights assume specific clinical units; where this module's expected
  // units differ from the paper's, treat the value as already converted.
  // CRP enters as ln(crp) in mg/dL — we convert mg/L -> mg/dL (÷10) and guard ≤0.
  const COEF = {
    intercept: -19.9067,
    albumin: -0.0336, // per g/L
    creatinine: 0.0095, // per umol/L
    glucose: 0.1953, // per mmol/L
    lnCrp: 0.0954, // per ln(mg/dL)
    lymphocytePct: -0.012, // per %
    mcv: 0.0268, // per fL
    rdw: 0.3306, // per %
    alkPhos: 0.0019, // per U/L
    wbc: 0.0554, // per 1000/uL
    age: 0.0804, // per year
  };

  let xb = COEF.intercept;
  // Build the linear predictor from whatever markers are present. Missing terms
  // simply contribute nothing (a documented simplification of the full model).
  if (albumin != null) xb += COEF.albumin * albumin;
  if (creatinine != null) xb += COEF.creatinine * creatinine;
  if (glucose != null) xb += COEF.glucose * glucose;
  if (crp != null) {
    const crpMgDl = Math.max(crp / 10, 1e-4); // mg/L -> mg/dL, guard against ln(0)
    xb += COEF.lnCrp * Math.log(crpMgDl);
  }
  if (lymphocytePct != null) xb += COEF.lymphocytePct * lymphocytePct;
  if (mcv != null) xb += COEF.mcv * mcv;
  if (rdw != null) xb += COEF.rdw * rdw;
  if (alkPhos != null) xb += COEF.alkPhos * alkPhos;
  if (wbc != null) xb += COEF.wbc * wbc;
  xb += COEF.age * chronoAge;

  // Gompertz mortality conversion (t = 120 months = 10 years).
  const gamma = 0.0076927;
  const t = 120;
  const mortality =
    1 - Math.exp((-Math.exp(xb) * (Math.exp(gamma * t) - 1)) / gamma);

  // Numerical guard: mortality must stay in (0, 1) for the log conversion.
  const m = Math.min(Math.max(mortality, 1e-9), 1 - 1e-9);

  const phenoAgeYears =
    141.50225 + Math.log(-0.00553 * Math.log(1 - m)) / 0.090165;

  if (!Number.isFinite(phenoAgeYears)) return null;

  return Math.round(phenoAgeYears * 10) / 10;
}
