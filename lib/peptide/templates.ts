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
