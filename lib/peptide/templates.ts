// Titration templates + the peptide / GLP-1 compound catalog used by the
// ProtocolBuilder. A "step" is the dose to use from the given week onward,
// until the next step's week is reached.

export type TitrationStep = { week: number; dose_mg: number };

export const TITRATION_TEMPLATES: Record<string, TitrationStep[]> = {
  semaglutide: [
    { week: 1, dose_mg: 0.25 },
    { week: 5, dose_mg: 0.5 },
    { week: 9, dose_mg: 1.0 },
    { week: 13, dose_mg: 1.7 },
    { week: 17, dose_mg: 2.4 },
  ],
  tirzepatide: [
    { week: 1, dose_mg: 2.5 },
    { week: 5, dose_mg: 5 },
    { week: 9, dose_mg: 7.5 },
    { week: 13, dose_mg: 10 },
    { week: 17, dose_mg: 12.5 },
    { week: 21, dose_mg: 15 },
  ],
  "bpc-157": [
    { week: 1, dose_mg: 0.25 },
    { week: 2, dose_mg: 0.5 },
  ],
};

/**
 * Per-compound maximum single-dose ceiling (mg). [CLINICAL-REVIEW P1/P2]
 * GLP-1 ceilings are the FDA-labeled maxima. Research-peptide ceilings are
 * conservative fat-finger / mg-vs-mcg guards, NOT clinical maxima — a clinician
 * must confirm these before live prescribing.
 */
export const MAX_DOSE_MG: Record<string, number> = {
  semaglutide: 2.4,
  tirzepatide: 15,
  "bpc-157": 1,
  "nad+": 1000,
  "cjc-1295": 2,
  ipamorelin: 2,
  "tb-500": 10,
};

/** Ceiling for a compound (case-insensitive); conservative fallback for unknowns. */
export function maxDoseFor(compound: string | null | undefined): number {
  const key = String(compound ?? "").trim().toLowerCase();
  return MAX_DOSE_MG[key] ?? 100;
}

/** True when `dose` is a finite, positive mg value at or below the compound ceiling. */
export function isDoseSafe(dose: number, compound: string | null | undefined): boolean {
  return Number.isFinite(dose) && dose > 0 && dose <= maxDoseFor(compound);
}

export type PeptideCompound = { name: string; category: string };

export const PEPTIDE_COMPOUNDS: PeptideCompound[] = [
  { name: "semaglutide", category: "glp1" },
  { name: "tirzepatide", category: "glp1_gip" },
  { name: "bpc-157", category: "repair" },
  { name: "NAD+", category: "cognitive" },
  { name: "CJC-1295", category: "growth" },
  { name: "Ipamorelin", category: "growth" },
  { name: "TB-500", category: "repair" },
];
