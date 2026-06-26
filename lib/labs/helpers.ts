/**
 * Pure, DB-free helpers for lab-result trending.
 *
 * Functional-medicine framing: we evaluate biomarkers against an OPTIMAL band
 * (optimal_low..optimal_high), not just a lab's "normal" reference. A value
 * inside the band is "optimal"; below the band is "below"; above is "above".
 *
 * Trend is judged relative to the OPTIMAL band, not the raw direction: moving
 * toward the band (from either side) is "improving", moving away is "worsening".
 * A value already inside the band that stays inside is "flat" unless it moves
 * meaningfully toward the band's center.
 */

export type LabResult = {
  id: string;
  patient_id: string;
  marker: string;
  value: number;
  unit: string | null;
  optimal_low: number | null;
  optimal_high: number | null;
  category: string | null;
  collected_on: string | null;
  created_at: string;
};

export type LabStatus = "optimal" | "below" | "above";
export type LabTrend = "improving" | "worsening" | "flat";

export type MarkerSummary = {
  marker: string;
  unit: string | null;
  category: string | null;
  optimal_low: number | null;
  optimal_high: number | null;
  latest: LabResult;
  previous: LabResult | null;
  status: LabStatus;
  trend: LabTrend;
};

export type RangeBarPosition = {
  valuePct: number;
  bandLowPct: number;
  bandHighPct: number;
};

/** Where a value sits relative to the optimal band. */
export function statusOf(
  value: number,
  low: number | null,
  high: number | null,
): LabStatus {
  if (low != null && value < low) return "below";
  if (high != null && value > high) return "above";
  return "optimal";
}

/**
 * Signed "distance from optimal": 0 when inside the band, otherwise the gap to
 * the nearer band edge. Lower is healthier. Used to judge the trend direction.
 */
function distanceFromBand(
  value: number,
  low: number | null,
  high: number | null,
): number {
  if (low != null && value < low) return low - value;
  if (high != null && value > high) return value - high;
  return 0;
}

/**
 * Trend vs the previous reading, judged against the optimal band.
 *   improving = the new value is closer to (or now inside) the band
 *   worsening = the new value is further from the band
 *   flat      = no meaningful change in distance from the band
 */
export function trendOf(
  value: number,
  previousValue: number | null,
  low: number | null,
  high: number | null,
): LabTrend {
  if (previousValue == null || !Number.isFinite(previousValue)) return "flat";

  const prevDist = distanceFromBand(previousValue, low, high);
  const curDist = distanceFromBand(value, low, high);

  // Tolerance so tiny rounding wobble inside/near the band reads as flat.
  const scale = Math.max(Math.abs(value), Math.abs(previousValue), 1);
  const eps = scale * 0.005;

  if (curDist < prevDist - eps) return "improving";
  if (curDist > prevDist + eps) return "worsening";
  return "flat";
}

/**
 * Position a value and the optimal band on a 0–100 display track.
 *
 * The display window expands a little beyond the data so the band and the dot
 * are never glued to the edges: roughly
 *   [ min(low, value) * 0.85 .. max(high, value) * 1.15 ].
 * Guards against null bounds and a zero-width window. All outputs are clamped
 * to 0–100.
 */
export function rangeBarPosition(
  value: number,
  low: number | null,
  high: number | null,
): RangeBarPosition {
  const lo = low ?? value;
  const hi = high ?? value;

  const rawMin = Math.min(lo, value);
  const rawMax = Math.max(hi, value);

  let dispMin = rawMin * 0.85;
  let dispMax = rawMax * 1.15;

  // Handle negatives / zeros where the *0.85 / *1.15 trick can invert or
  // collapse the window.
  if (dispMin >= dispMax) {
    const center = (rawMin + rawMax) / 2;
    const pad = Math.max(Math.abs(center) * 0.15, 1);
    dispMin = Math.min(rawMin, center) - pad;
    dispMax = Math.max(rawMax, center) + pad;
  }

  const span = dispMax - dispMin || 1;
  const pct = (v: number) => clamp(((v - dispMin) / span) * 100, 0, 100);

  return {
    valuePct: pct(value),
    bandLowPct: low != null ? pct(low) : 0,
    bandHighPct: high != null ? pct(high) : 100,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Build a per-marker summary from that marker's results.
 * `results` should be a single marker's rows; they're sorted by collected_on
 * (then created_at) ascending internally, so latest/previous are reliable.
 */
export function summarizeMarker(results: LabResult[]): MarkerSummary | null {
  if (results.length === 0) return null;

  const sorted = [...results].sort(compareByDate);
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  const low = latest.optimal_low;
  const high = latest.optimal_high;

  return {
    marker: latest.marker,
    unit: latest.unit,
    category: latest.category,
    optimal_low: low,
    optimal_high: high,
    latest,
    previous,
    status: statusOf(latest.value, low, high),
    trend: trendOf(latest.value, previous?.value ?? null, low, high),
  };
}

/** Ascending by collected_on, then created_at as a tiebreaker. */
function compareByDate(a: LabResult, b: LabResult): number {
  const da = a.collected_on ?? a.created_at;
  const db = b.collected_on ?? b.created_at;
  if (da < db) return -1;
  if (da > db) return 1;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/**
 * Reduce all of a patient's lab rows to one MarkerSummary per marker (using the
 * latest reading per marker), preserving the marker's full history for trend.
 */
export function summarizePerMarker(all: LabResult[]): MarkerSummary[] {
  const byMarker = new Map<string, LabResult[]>();
  for (const r of all) {
    const list = byMarker.get(r.marker) ?? [];
    list.push(r);
    byMarker.set(r.marker, list);
  }
  const out: MarkerSummary[] = [];
  for (const list of byMarker.values()) {
    const s = summarizeMarker(list);
    if (s) out.push(s);
  }
  return out.sort((a, b) => a.marker.localeCompare(b.marker));
}

/** Group the latest-per-marker summaries by category for sectioned display. */
export function groupByCategory(
  latestPerMarker: MarkerSummary[],
): { category: string; markers: MarkerSummary[] }[] {
  const groups = new Map<string, MarkerSummary[]>();
  for (const m of latestPerMarker) {
    const cat = m.category ?? "Other";
    const list = groups.get(cat) ?? [];
    list.push(m);
    groups.set(cat, list);
  }
  return Array.from(groups.entries())
    .map(([category, markers]) => ({ category, markers }))
    .sort((a, b) => a.category.localeCompare(b.category));
}
