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
 * UNITS: inputs are expected in SI. extractMarkerMap() now CONVERTS recognised
 * conventional/US units to SI (see the unit-conversion block below) before
 * scoring, and the SI-bounds check in phenoAge() remains as a final sanity net.
 *
 * All functions are pure.
 */

export type BioMarker = { name: string; value: number };

/** A panel marker that may carry a lab-reported unit string. */
export type PanelMarker = { name: string; value: number; unit?: string | null };

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
 * Plausible SI-unit ranges per marker (the units the formula expects). Used as a
 * fail-safe: values outside these bounds are almost always conventional/US units
 * entered without conversion, so we refuse to score rather than mislead.
 */
const SI_BOUNDS: Record<CanonicalKey, [number, number]> = {
  albumin: [20, 60], // g/L       (US g/dL ~4.7 would be < 20 -> refuse)
  creatinine: [20, 1500], // umol/L    (US mg/dL ~0.8 would be < 20 -> refuse)
  glucose: [2, 40], // mmol/L    (US mg/dL ~90 would be > 40 -> refuse)
  crp: [0, 300], // mg/L
  lymphocyte_pct: [1, 90], // %
  mcv: [60, 130], // fL
  rdw: [9, 30], // %
  alk_phos: [10, 1000], // U/L
  wbc: [1, 100], // 1000/uL
};

/**
 * ── Unit conversion (conventional / US → SI) ────────────────────────────────
 *
 * The PhenoAge formula expects SI units. Labs frequently report US-conventional
 * units, so we CONVERT to SI before scoring. Conversions applied:
 *
 *   albumin     g/dL  → g/L      ( × 10    )
 *   creatinine  mg/dL → µmol/L   ( × 88.42 )
 *   glucose     mg/dL → mmol/L   ( ÷ 18    )   (≈ /18.0182, MW glucose)
 *   crp         mg/L  → mg/dL    ( ÷ 10    )   (note: phenoAge takes ln(mg/dL))
 *
 * The remaining 5 markers (lymphocyte %, MCV fL, RDW %, alk phos U/L, WBC
 * 10^3/µL) use the same numeric units in both conventions — no conversion.
 *
 * How we decide SI vs conventional (per marker, when NO explicit unit is given):
 *   1. If the value already sits inside its plausible SI range, assume SI — leave it.
 *   2. Else if it matches the marker's known CONVENTIONAL range, convert it.
 *   3. Else (ambiguous / unknown) we leave it as-is and let the SI-bounds
 *      fail-safe in phenoAge() refuse it. We never guess into a wild result.
 * When an explicit `unit` string IS provided, we trust it (after recognising it).
 *
 * A clinician / lab-config should confirm this unit handling before clinical use.
 * The SI-bounds check in phenoAge() remains a FINAL sanity net after conversion.
 */
const CONVENTIONAL_BOUNDS: Partial<Record<CanonicalKey, [number, number]>> = {
  albumin: [1, 8], // g/dL   (typical 3.5–5.5)
  creatinine: [0.1, 15], // mg/dL  (typical 0.6–1.3)
  glucose: [40, 600], // mg/dL  (typical 70–110)
  // CRP is intentionally OMITTED from range-inference: mg/L (SI) and mg/dL
  // (conventional) ranges overlap heavily at low values, so the value alone is
  // ambiguous. CRP is only converted when an EXPLICIT mg/dL unit is supplied;
  // otherwise it is treated as the module's SI input (mg/L).
};

/** Per-marker SI converter from a recognised conventional unit. */
const TO_SI: Partial<Record<CanonicalKey, (v: number) => number>> = {
  albumin: (v) => v * 10, // g/dL  -> g/L
  creatinine: (v) => v * 88.42, // mg/dL -> µmol/L
  glucose: (v) => v / 18, // mg/dL -> mmol/L
  // crp is converted to mg/dL inside phenoAge() (it takes ln(mg/dL)); here we
  // only normalise its scale to mg/L (the module's SI input). mg/L IS the SI
  // input, so no conversion is applied at extract time.
};

/**
 * Recognise an explicit unit string as SI ("si"), conventional ("conv"), or
 * unknown (null) for a given canonical marker. Tolerant of casing / micro signs.
 */
function classifyUnit(
  key: CanonicalKey,
  unit: string | null | undefined,
): "si" | "conv" | null {
  if (!unit || typeof unit !== "string") return null;
  const u = unit
    .toLowerCase()
    .replace(/µ|μ/g, "u")
    .replace(/\s+/g, "");
  switch (key) {
    case "albumin":
      if (u === "g/l") return "si";
      if (u === "g/dl") return "conv";
      return null;
    case "creatinine":
      if (u === "umol/l" || u === "µmol/l") return "si";
      if (u === "mg/dl") return "conv";
      return null;
    case "glucose":
      if (u === "mmol/l") return "si";
      if (u === "mg/dl") return "conv";
      return null;
    case "crp":
      // The module's SI input for CRP is mg/L; mg/dL is "conventional" here.
      if (u === "mg/l") return "si";
      if (u === "mg/dl") return "conv";
      return null;
    default:
      return null;
  }
}

/**
 * Convert one marker value to the module's expected SI input.
 *
 * Priority: explicit unit (trusted) → range-based inference → leave as-is.
 * For CRP, "conventional" means mg/dL: we multiply by 10 to reach mg/L (the SI
 * input this module expects), which phenoAge() then divides back to mg/dL.
 * Returns the (possibly converted) value; ambiguous inputs pass through unchanged
 * so the SI-bounds fail-safe can reject them.
 */
function toSiValue(
  key: CanonicalKey,
  value: number,
  unit: string | null | undefined,
): number {
  const toSi = TO_SI[key];
  const explicit = classifyUnit(key, unit);

  if (explicit === "si") return value; // already SI per the label.
  if (explicit === "conv") {
    if (key === "crp") return value * 10; // mg/dL -> mg/L (module SI input)
    return toSi ? toSi(value) : value;
  }

  // No usable explicit unit: infer from the value's range.
  const si = SI_BOUNDS[key];
  const conv = CONVENTIONAL_BOUNDS[key];
  const inSi = si && value >= si[0] && value <= si[1];
  if (inSi) return value; // plausibly already SI — leave it.
  const inConv = conv && value >= conv[0] && value <= conv[1];
  if (inConv) {
    if (key === "crp") return value * 10; // mg/dL -> mg/L
    return toSi ? toSi(value) : value;
  }
  // Ambiguous / unknown — leave as-is; phenoAge() SI-bounds will refuse it.
  return value;
}

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
 * Normalize an array of panel markers into a map keyed by canonical marker name,
 * CONVERTING each value to the module's expected SI input.
 *
 * Each marker may carry an optional `unit` string; conversion uses it when it is
 * recognised, otherwise falls back to range-based SI-vs-conventional inference
 * (see toSiValue). Unrecognized markers are dropped; non-finite values skipped.
 */
export function extractMarkerMap(
  panelMarkers: PanelMarker[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of panelMarkers ?? []) {
    if (!m || typeof m.name !== "string") continue;
    const token = normalizeName(m.name);
    const key = ALIASES[token];
    if (!key) continue;
    const value = Number(m.value);
    if (!Number.isFinite(value)) continue;
    const converted = toSiValue(key, value, m.unit ?? null);
    // First occurrence wins (panels are typically ordered most-relevant first).
    if (!(key in out)) out[key] = converted;
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

  // PhenoAge is only defined with ALL 9 biomarkers + age. A reduced-marker score
  // keeps the full-model intercept and is meaningless (its value depends on WHICH
  // markers are missing, not the patient), so refuse partial panels. [CLINICAL-REVIEW L2]
  const required: Array<[CanonicalKey, number | null]> = [
    ["albumin", albumin], ["creatinine", creatinine], ["glucose", glucose],
    ["crp", crp], ["lymphocyte_pct", lymphocytePct], ["mcv", mcv],
    ["rdw", rdw], ["alk_phos", alkPhos], ["wbc", wbc],
  ];
  if (required.some(([, v]) => v == null)) return null;
  if (!Number.isFinite(chronoAge) || chronoAge <= 0) return null;

  // The formula REQUIRES SI units. extractMarkerMap() converts recognised
  // conventional/US units to SI before this point, but this SI-bounds check stays
  // as a FINAL fail-safe net: any value still outside its plausible SI range
  // (e.g. an unconverted/ambiguous entry, or glucose 90 mg/dL read as 90 mmol/L)
  // is refused rather than emitting a wild age. [CLINICAL-REVIEW L1]
  for (const [key, v] of required) {
    const b = SI_BOUNDS[key];
    if (v == null || v < b[0] || v > b[1]) return null;
  }

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
    141.50225 + Math.log(-0.00553 * Math.log(1 - m)) / 0.09165; // [CLINICAL-REVIEW L3] was 0.090165 (typo)

  if (!Number.isFinite(phenoAgeYears)) return null;

  return Math.round(phenoAgeYears * 10) / 10;
}
