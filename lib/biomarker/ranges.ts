// Pure helpers for evaluating biomarker values against reference / optimal ranges.

export type Marker = {
  name: string;
  value: number;
  unit?: string;
  ref_low?: number;
  ref_high?: number;
  optimal_low?: number;
  optimal_high?: number;
};

export type MarkerStatus = "optimal" | "normal" | "high" | "low";

/**
 * Classify a marker:
 *  - "optimal" if an optimal range is provided and the value sits within it.
 *  - otherwise "normal" if a reference range is provided and the value sits within it.
 *  - otherwise "high"/"low" relative to whichever reference bound is exceeded.
 * When neither range gives a verdict, defaults to "normal".
 */
export function markerStatus(m: Marker): MarkerStatus {
  const v = m.value;
  const hasOptLow = typeof m.optimal_low === "number";
  const hasOptHigh = typeof m.optimal_high === "number";

  // Optimal window takes priority when defined.
  if (hasOptLow || hasOptHigh) {
    const aboveLow = !hasOptLow || v >= (m.optimal_low as number);
    const belowHigh = !hasOptHigh || v <= (m.optimal_high as number);
    if (aboveLow && belowHigh) return "optimal";
  }

  const hasRefLow = typeof m.ref_low === "number";
  const hasRefHigh = typeof m.ref_high === "number";

  if (hasRefHigh && v > (m.ref_high as number)) return "high";
  if (hasRefLow && v < (m.ref_low as number)) return "low";

  return "normal";
}

/** CSS color for a given status. */
export function statusColor(s: MarkerStatus): string {
  switch (s) {
    case "optimal":
      return "#16a34a";
    case "high":
    case "low":
      return "var(--berry)";
    case "normal":
    default:
      return "var(--muted)";
  }
}
