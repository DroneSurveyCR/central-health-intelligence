// Canonical body-map systems the staff editor fills and the 2D/3D viewers read.
// Part ids match the viewer part ids; the editor writes the per-patient overlay
// (status/value/score/note for baseline + projected) onto scans.bodymap.

export type BmStatus = "sage" | "gold" | "rust"; // healthy / watch / out of range
export type BmPoint = { st: BmStatus; v: string; score: number };
export type BmPart = { s1: BmPoint; s2: BmPoint; note: string };

export type BmCross = { id: string; name: string; st: BmStatus; sub: string; note: string };

export const STATUS_OPTIONS: { value: BmStatus; label: string }[] = [
  { value: "sage", label: "Healthy" },
  { value: "gold", label: "Watch" },
  { value: "rust", label: "Out of range" },
];

export const STATUS_HEX: Record<BmStatus, string> = {
  sage: "#6fae84",
  gold: "#f4a63c",
  rust: "#e0613b",
};

export type PartDef = { id: string; name: string; metric: string };
export type LayerDef = { id: string; name: string; parts: PartDef[] };

export const BODYMAP_LAYERS: LayerDef[] = [
  { id: "skin", name: "Skin", parts: [{ id: "skin", name: "Collagen", metric: "Collagen coeff." }] },
  { id: "circulatory", name: "Circulatory", parts: [
    { id: "resistance", name: "Vascular resistance", metric: "Vascular resistance" },
    { id: "elasticity", name: "Vessel elasticity", metric: "Vascular elasticity" },
    { id: "viscosity", name: "Blood viscosity", metric: "Blood viscosity" },
    { id: "lipids", name: "Blood fat", metric: "Lipids coeff." },
  ] },
  { id: "organs", name: "Organs", parts: [
    { id: "cardio", name: "Heart", metric: "Cardiac load" },
    { id: "respiratory", name: "Lungs", metric: "Vital capacity" },
    { id: "liver", name: "Liver", metric: "Liver panel" },
    { id: "kidneys", name: "Kidneys", metric: "BUN" },
    { id: "gut", name: "Gut", metric: "Gastric absorption" },
    { id: "spleen", name: "Immune", metric: "Immune panel" },
  ] },
  { id: "nervous", name: "Nervous", parts: [
    { id: "cognition", name: "Cognition", metric: "Memory index" },
    { id: "nerve", name: "Nerve conduction", metric: "Cerebrovascular O₂" },
  ] },
  { id: "skeletal", name: "Skeletal", parts: [
    { id: "bone", name: "Bone density", metric: "Bone hyperplasia" },
    { id: "joints", name: "Joints", metric: "Joint load" },
  ] },
  { id: "muscular", name: "Muscular", parts: [
    { id: "mass", name: "Muscle mass", metric: "Lean mass" },
    { id: "recovery", name: "Recovery", metric: "Recovery index" },
  ] },
];

// "resistance" (2D viewer id) is the same datum as "inflam" (3D viewer id).
export const PART_ALIASES: Record<string, string> = { resistance: "inflam" };

export const ALL_PART_IDS: string[] = BODYMAP_LAYERS.flatMap((l) => l.parts.map((p) => p.id));

export const CROSS_DEFS: { id: string; name: string; sub: string }[] = [
  { id: "toxins", name: "Toxic burden", sub: "Heavy metals · oxidative load" },
  { id: "micronutrients", name: "Micronutrients", sub: "Vitamins · minerals" },
  { id: "hormones", name: "Hormones", sub: "Thyroid · adrenal · sex hormones" },
];

export function blankPart(): BmPart {
  return { s1: { st: "sage", v: "in range", score: 80 }, s2: { st: "sage", v: "in range", score: 85 }, note: "" };
}
