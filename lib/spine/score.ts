// Spine Alignment Score — a composite 0-100 index (100 = ideal alignment).
//
// A deterministic, explainable tracking metric derived from the documented findings.
// It is NOT a validated clinical index or a diagnosis — it's an at-a-glance number the
// clinician interprets and tracks visit-over-visit. Every point of deduction is itemised
// so the score is transparent, never a black box.

import {
  CURVE_NORMS,
  classifyScoliosis,
  classifyCurve,
  type SpineSeverity,
  type SpineConditions,
  type VertebraFinding,
  type CurveId,
} from "./schema";

export type ScoreBand = "excellent" | "good" | "fair" | "guarded" | "poor";
export type SpineScore = { score: number; band: ScoreBand; deductions: { label: string; points: number }[] };

// Per-vertebra severity penalty, segmental motion penalty, and postural-region penalty.
const SEV_PEN: Record<SpineSeverity, number> = { normal: 0, mild: 1.5, moderate: 3, high: 5 };
const MOTION_PEN: Record<string, number> = { normal: 0, hypomobile: 1, hypermobile: 1, fixated: 2 };
const POST_PEN: Record<SpineSeverity, number> = { normal: 0, mild: 1, moderate: 2, high: 3 };

export function scoreBand(score: number): ScoreBand {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "fair";
  if (score >= 40) return "guarded";
  return "poor";
}

/**
 * Compute the alignment score from the documented findings.
 * @param point which scan point to read on each vertebra ("s2" = current, "s1" = baseline).
 */
export function scoreSpine(
  vertebrae: VertebraFinding[],
  conditions: SpineConditions,
  regions: { severity: SpineSeverity }[],
  point: "s1" | "s2" = "s2",
): SpineScore {
  const deductions: { label: string; points: number }[] = [];
  const add = (label: string, points: number) => {
    if (points > 0) deductions.push({ label, points: Math.round(points * 10) / 10 });
  };

  // Per-vertebra severity + segmental motion.
  let vSev = 0;
  let vMot = 0;
  for (const v of vertebrae) {
    const p = v?.[point];
    if (!p) continue;
    vSev += SEV_PEN[p.severity] ?? 0;
    vMot += MOTION_PEN[p.motion] ?? 0;
  }
  add("Vertebral findings", vSev);
  add("Segmental motion", vMot);

  // Sagittal curves out of their normal range (only if measured).
  let curveP = 0;
  for (const id of Object.keys(CURVE_NORMS) as CurveId[]) {
    const deg = conditions.curves?.[id];
    if (deg != null && classifyCurve(id, deg) !== "normal") curveP += 4;
  }
  add("Curve abnormality", curveP);

  // Scoliosis by Cobb grade.
  const grade = classifyScoliosis(conditions.scoliosis?.cobbDeg || 0);
  add("Scoliosis", grade === "mild" ? 5 : grade === "moderate" ? 10 : grade === "severe" ? 18 : 0);

  // Documented conditions (stenosis, spondylosis, …).
  add("Conditions", (conditions.flags?.length ?? 0) * 4);

  // Postural chain (head/shoulders/pelvis/knees/feet).
  let postP = 0;
  for (const r of regions) postP += POST_PEN[r?.severity] ?? 0;
  add("Postural chain", postP);

  const total = deductions.reduce((s, d) => s + d.points, 0);
  const score = Math.max(0, Math.round(100 - total));
  return { score, band: scoreBand(score), deductions };
}
