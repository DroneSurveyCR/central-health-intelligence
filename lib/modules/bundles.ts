import type { ModuleId } from "./types";

/**
 * Vertical → extra modules preselected ON TOP of DEFAULT_ON. Single source of
 * truth, shared by self-serve onboarding (app/onboarding) and admin provisioning
 * (app/superadmin/new). These are suggestions the user/admin can toggle; the
 * server always re-validates against the manifest and re-adds DEFAULT_ON.
 */
export type Vertical =
  | "integrative"
  | "longevity"
  | "peptide"
  | "psychedelic"
  | "functional"
  | "womens";

export const VERTICAL_IDS: Vertical[] = [
  "integrative",
  "longevity",
  "peptide",
  "psychedelic",
  "functional",
  "womens",
];

export const VERTICAL_LABELS: Record<Vertical, string> = {
  integrative: "Integrative",
  longevity: "Longevity",
  peptide: "Peptide & GLP-1",
  psychedelic: "Plant Medicine",
  functional: "Functional",
  womens: "Women's Health",
};

export const VERTICAL_MODULES: Record<Vertical, ModuleId[]> = {
  integrative: ["labs", "wearables", "nutrition"],
  longevity: ["labs", "wearables", "weight", "longevity"],
  peptide: ["labs", "rx", "peptide"],
  psychedelic: ["labs", "psychedelic"],
  functional: ["labs", "nutrition", "weight"],
  womens: ["labs", "rx", "hrt"],
};
