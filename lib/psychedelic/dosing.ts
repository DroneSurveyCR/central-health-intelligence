/**
 * Suggested dosing reference for psychedelic-assisted therapy.
 *
 * NOT a prescribing tool — these are educational starting-range references only.
 * Final dosing is a clinical decision made by a qualified practitioner.
 */

export interface DoseSuggestion {
  low: number;
  mid: number;
  high: number;
  unit: string;
  notes: string;
}

/** Round to one decimal place to keep weight-based math readable. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Returns a low/mid/high suggested dose for the given substance.
 *
 * Weight-based substances (ketamine) scale with `weightKg`. Fixed-dose
 * substances (psilocybin, MDMA) ignore weight. Ibogaine is flagged as
 * requiring specialist supervision and ECG/QTc screening.
 */
export function suggestedDose(
  substance: string,
  weightKg: number,
): DoseSuggestion {
  const key = (substance || "").trim().toLowerCase();
  const w = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0;

  switch (key) {
    case "ketamine":
      // 0.5 / 1.0 / 1.5 mg/kg IM.
      return {
        low: round1(0.5 * w),
        mid: round1(1.0 * w),
        high: round1(1.5 * w),
        unit: "mg",
        notes:
          "Weight-based IM dosing (0.5 / 1.0 / 1.5 mg/kg). Titrate to clinical response; monitor BP and dissociation.",
      };
    case "psilocybin":
      // Fixed clinical-range dosing.
      return {
        low: 15,
        mid: 25,
        high: 35,
        unit: "mg",
        notes:
          "Fixed dosing (mg). 25 mg is a common high-dose research target. Provide preparation and full-session support.",
      };
    case "mdma":
      // Fixed dosing with optional supplemental half-dose in protocols.
      return {
        low: 80,
        mid: 120,
        high: 160,
        unit: "mg",
        notes:
          "Fixed dosing (mg). Common protocols use ~120 mg with an optional supplemental half-dose. Monitor BP, temperature, and hydration.",
      };
    case "ibogaine":
      return {
        low: 0,
        mid: 0,
        high: 0,
        unit: "mg",
        notes:
          "Ibogaine requires ECG/QTc screening and specialist medical supervision (cardiac arrhythmia risk). No suggested dose provided here.",
      };
    default:
      return {
        low: 0,
        mid: 0,
        high: 0,
        unit: "mg",
        notes:
          "No standardized dosing reference available for this substance. Consult specialist protocols.",
      };
  }
}
