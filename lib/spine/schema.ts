// Canonical spine / musculoskeletal vocabulary for the chiro module.
//
// The SHARED contract both renderers read: the 2D layered viewer and the 3D
// (three.js) viewer render the same per-vertebra findings by `region_code`, so
// adding vertebrae here lights up both without touching either renderer. Finding
// carries a baseline (s1) + current (s2) point so it rides the existing
// before/after morph slider (see lib/body3d/Body3DViewer.tsx).
//
// Severity strings match the 3D viewer's SEV colour map (mild/moderate/high);
// "normal" renders uncoloured. Keep this a pure literal module — no imports.

export type SpineSeverity = "normal" | "mild" | "moderate" | "high";

export const SEVERITY_HEX: Record<SpineSeverity, string> = {
  normal: "#6fae84", // sage — in range
  mild: "#f4a63c", // gold
  moderate: "#ee7a4f",
  high: "#c0392b", // rust
};

export const SEVERITY_OPTIONS: { value: SpineSeverity; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "Severe" },
];

// ── Vertebrae ───────────────────────────────────────────────────────────────
// region_code is the lowercased id the viewers match on (c1…t12, l1…l5, s1).

export type SpineRegionId = "cervical" | "thoracic" | "lumbar" | "sacral";

export type VertebraDef = { id: string; region: SpineRegionId; label: string };

function seq(region: SpineRegionId, prefix: string, from: number, to: number): VertebraDef[] {
  const out: VertebraDef[] = [];
  for (let n = from; n <= to; n++) out.push({ id: `${prefix}${n}`, region, label: `${prefix.toUpperCase()}${n}` });
  return out;
}

export const VERTEBRAE: VertebraDef[] = [
  ...seq("cervical", "c", 1, 7), // C1 (Atlas) … C7
  ...seq("thoracic", "t", 1, 12), // T1 … T12 (rib-bearing)
  ...seq("lumbar", "l", 1, 5), // L1 … L5 (load-bearing)
  { id: "s1", region: "sacral", label: "S1" }, // sacral base
];

export const VERTEBRA_IDS: string[] = VERTEBRAE.map((v) => v.id);

// Non-spinal alignment regions the same assessment covers (postural chain).
export const BODY_REGIONS: { id: string; label: string }[] = [
  { id: "head", label: "Head / cervical posture" },
  { id: "shoulders", label: "Shoulders" },
  { id: "pelvis", label: "Pelvis / hips" },
  { id: "knees", label: "Knees" },
  { id: "feet", label: "Feet / arches" },
];

// ── Per-vertebra finding ──────────────────────────────────────────────────────
// Subluxation "listing" in plain directional terms (Gonstead letter listings can
// map onto these later). Motion = fixation state from motion palpation.

export type SubluxationDir =
  | "anterior" | "posterior"
  | "left" | "right"
  | "rotation_left" | "rotation_right"
  | "flexion" | "extension";

export type MotionState = "normal" | "hypomobile" | "hypermobile" | "fixated";

export type VertebraPoint = { severity: SpineSeverity; listing: SubluxationDir[]; motion: MotionState };

export type VertebraFinding = {
  region_code: string; // vertebra id, e.g. "c3"
  s1: VertebraPoint; // baseline scan
  s2: VertebraPoint; // current scan (drives the morph slider)
  note: string;
  nerve?: string; // referred/dermatome note, e.g. "C6 — thumb, lateral forearm"
};

export function blankVertebraPoint(): VertebraPoint {
  return { severity: "normal", listing: [], motion: "normal" };
}

export function blankVertebra(region_code: string): VertebraFinding {
  return { region_code, s1: blankVertebraPoint(), s2: blankVertebraPoint(), note: "" };
}

// ── Overall spine conditions ─────────────────────────────────────────────────
// Curve norms (degrees) from standard radiographic ranges; classify() flags
// hypo/normal/hyper. Scoliosis by Cobb angle: ≥10° positive.

export type CurveId = "cervical_lordosis" | "thoracic_kyphosis" | "lumbar_lordosis";

export const CURVE_NORMS: Record<CurveId, { label: string; min: number; max: number }> = {
  cervical_lordosis: { label: "Cervical lordosis", min: 20, max: 40 },
  thoracic_kyphosis: { label: "Thoracic kyphosis", min: 20, max: 40 },
  lumbar_lordosis: { label: "Lumbar lordosis", min: 20, max: 35 },
};

export function classifyCurve(id: CurveId, deg: number): "hypo" | "normal" | "hyper" {
  const n = CURVE_NORMS[id];
  if (deg < n.min) return "hypo";
  if (deg > n.max) return "hyper";
  return "normal";
}

export type ScoliosisGrade = "none" | "mild" | "moderate" | "severe";

export function classifyScoliosis(cobbDeg: number): ScoliosisGrade {
  if (cobbDeg < 10) return "none";
  if (cobbDeg <= 25) return "mild";
  if (cobbDeg <= 40) return "moderate";
  return "severe";
}

// Flags a chiro toggles on the overall assessment (beyond curve/scoliosis).
export const SPINE_CONDITION_FLAGS: { id: string; label: string }[] = [
  { id: "stenosis", label: "Spinal stenosis" },
  { id: "spondylosis", label: "Spondylosis (degenerative)" },
  { id: "spondylolisthesis", label: "Spondylolisthesis" },
  { id: "ddd", label: "Degenerative disc disease" },
  { id: "disc_herniation", label: "Disc herniation" },
  { id: "facet_syndrome", label: "Facet syndrome" },
];

export type SpineConditions = {
  scoliosis: { cobbDeg: number; apex: string; convexity: "left" | "right" | "" };
  curves: Partial<Record<CurveId, number>>; // measured degrees
  flags: string[]; // ids from SPINE_CONDITION_FLAGS
  note: string;
};

export function blankSpineConditions(): SpineConditions {
  return { scoliosis: { cobbDeg: 0, apex: "", convexity: "" }, curves: {}, flags: [], note: "" };
}

// ── Dermatome / clinical correlation per level ───────────────────────────────
// A quick reference the editor shows beside the selected vertebra. Simplified
// from standard dermatome maps — an orientation aid, not a diagnosis.
export const DERMATOME: Record<string, string> = {
  c1: "Vertex of scalp",
  c2: "Occiput, posterior scalp",
  c3: "Neck, upper trapezius",
  c4: "Base of neck, shoulders · diaphragm (phrenic)",
  c5: "Lateral shoulder / upper arm · deltoid",
  c6: "Lateral forearm, thumb & index",
  c7: "Posterior arm, middle finger · triceps",
  t1: "Axilla, medial forearm · hand intrinsics",
  t2: "Medial upper arm, upper chest",
  t3: "Upper chest (3rd intercostal)",
  t4: "Nipple line",
  t5: "Chest (5th intercostal)",
  t6: "Xiphoid level",
  t7: "Lower chest / upper abdomen",
  t8: "Upper abdomen",
  t9: "Mid abdomen",
  t10: "Umbilicus",
  t11: "Lower abdomen",
  t12: "Suprapubic / inguinal",
  l1: "Groin, upper anterior thigh",
  l2: "Anterior mid-thigh",
  l3: "Anterior thigh, knee",
  l4: "Medial leg, medial ankle, big toe",
  l5: "Dorsum of foot, great-toe web",
  s1: "Lateral foot, heel, sole",
};

export function dermatomeFor(code: string): string {
  return DERMATOME[code] ?? "";
}
