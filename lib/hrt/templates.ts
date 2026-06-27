// HRT / hormone-optimization catalog used by the HRT ProtocolBuilder.
// Mirrors lib/peptide/templates.ts: a hormone catalog with default routes,
// a per-hormone MAX_DOSE ceiling map, and an isDoseSafe() guard.

export type HrtHormone = {
  name: string; // canonical key used by the MAX_DOSE map (lowercased)
  label: string; // display label
  defaultRoute: string;
  dose_unit: string;
};

/**
 * Hormone catalog. `name` is the canonical key (matches MAX_DOSE_BY_HORMONE);
 * `defaultRoute` pre-selects the route in the builder.
 */
export const HRT_HORMONES: HrtHormone[] = [
  {
    name: "testosterone_cypionate",
    label: "Testosterone Cypionate",
    defaultRoute: "intramuscular",
    dose_unit: "mg",
  },
  {
    name: "testosterone_enanthate",
    label: "Testosterone Enanthate",
    defaultRoute: "intramuscular",
    dose_unit: "mg",
  },
  {
    name: "estradiol",
    label: "Estradiol",
    defaultRoute: "transdermal",
    dose_unit: "mg",
  },
  {
    name: "progesterone",
    label: "Progesterone",
    defaultRoute: "oral",
    dose_unit: "mg",
  },
  {
    name: "dhea",
    label: "DHEA",
    defaultRoute: "oral",
    dose_unit: "mg",
  },
  {
    name: "thyroid",
    label: "Thyroid (T3/T4)",
    defaultRoute: "oral",
    dose_unit: "mcg",
  },
];

export const HRT_ROUTES = [
  "intramuscular",
  "subcutaneous",
  "transdermal",
  "oral",
  "sublingual",
  "topical",
  "pellet",
];

/**
 * Per-hormone maximum single-dose / weekly-equivalent ceiling.
 * [CLINICAL-REVIEW P1/P2] These are conservative fat-finger / mg-vs-mcg GUARDS,
 * NOT clinical maxima or dosing truth. A clinician MUST confirm these values
 * before live prescribing. Units follow the catalog dose_unit (mg unless noted).
 *
 *  - testosterone_* : <= 200 mg / week-equivalent
 *  - estradiol      : <= 10 mg
 *  - progesterone   : <= 400 mg
 *  - dhea           : <= 100 mg
 *  - thyroid        : <= 200 mcg (T3/T4 dosed in mcg)
 */
export const MAX_DOSE_BY_HORMONE: Record<string, number> = {
  testosterone_cypionate: 200,
  testosterone_enanthate: 200,
  estradiol: 10,
  progesterone: 400,
  dhea: 100,
  thyroid: 200,
};

/** Ceiling for a hormone (case-insensitive); conservative fallback for unknowns. */
export function maxDoseFor(hormone: string | null | undefined): number {
  const key = String(hormone ?? "").trim().toLowerCase();
  return MAX_DOSE_BY_HORMONE[key] ?? 100;
}

/** True when `dose` is a finite, positive value at or below the hormone ceiling. */
export function isDoseSafe(
  dose: number,
  hormone: string | null | undefined,
): boolean {
  return Number.isFinite(dose) && dose > 0 && dose <= maxDoseFor(hormone);
}

/** Default route for a hormone (case-insensitive); falls back to oral. */
export function defaultRouteFor(hormone: string | null | undefined): string {
  const key = String(hormone ?? "").trim().toLowerCase();
  return HRT_HORMONES.find((h) => h.name === key)?.defaultRoute ?? "oral";
}

/** Default dose unit for a hormone (case-insensitive); falls back to mg. */
export function doseUnitFor(hormone: string | null | undefined): string {
  const key = String(hormone ?? "").trim().toLowerCase();
  return HRT_HORMONES.find((h) => h.name === key)?.dose_unit ?? "mg";
}
