// Pure aggregation helpers for the progress engine. No DB access here — these
// take rows already fetched (RLS-scoped) and shape them for the SVG charts.
// All helpers are defensive about empty / malformed / missing value_json.

export type ProgressLog = {
  kind: string | null;
  value_json: unknown;
  logged_at: string | null;
};

export type PlanCompletion = {
  date: string | null;
  completed: boolean | null;
};

export type Point = { x: string; y: number };
export type Bar = { label: string; value: number };

/** Short, locale-friendly day label like "Jun 21". */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** YYYY-MM-DD key in local time, for grouping by calendar day. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/**
 * "How I feel" score series, oldest → newest.
 * value_json shape: { score: 1-10, note?: string }.
 */
export function feelingSeries(logs: ProgressLog[] | null | undefined): Point[] {
  const rows = (logs ?? [])
    .filter((l) => l.kind === "how_i_feel" && l.logged_at)
    .map((l) => {
      const score = toNumber(asRecord(l.value_json).score);
      return score == null ? null : { at: l.logged_at as string, score };
    })
    .filter((r): r is { at: string; score: number } => r !== null)
    .sort((a, b) => +new Date(a.at) - +new Date(b.at));

  return rows.map((r) => ({ x: dayLabel(r.at), y: r.score }));
}

/** A point that may have no value at a given x position (keeps series aligned). */
export type NullablePoint = { x: string; y: number | null };

/**
 * Blood-pressure series, oldest → newest, with matching day labels.
 * value_json shape: { systolic: number, diastolic: number }.
 *
 * Both series are index-aligned to the SAME ordered row set: each row
 * contributes one entry to `labels`, `systolic`, and `diastolic`. A missing
 * leg becomes `y: null` at that index rather than being dropped, so the two
 * lines never desync (LineChart positions points by shared array index).
 */
export function bpSeries(logs: ProgressLog[] | null | undefined): {
  labels: string[];
  systolic: NullablePoint[];
  diastolic: NullablePoint[];
} {
  const rows = (logs ?? [])
    .filter((l) => l.kind === "vital" && l.logged_at)
    .map((l) => {
      const v = asRecord(l.value_json);
      const systolic = toNumber(v.systolic);
      const diastolic = toNumber(v.diastolic);
      if (systolic == null && diastolic == null) return null;
      return { at: l.logged_at as string, systolic, diastolic };
    })
    .filter(
      (r): r is { at: string; systolic: number | null; diastolic: number | null } =>
        r !== null,
    )
    .sort((a, b) => +new Date(a.at) - +new Date(b.at));

  const labels = rows.map((r) => dayLabel(r.at));
  const systolic: NullablePoint[] = rows.map((r) => ({
    x: dayLabel(r.at),
    y: r.systolic,
  }));
  const diastolic: NullablePoint[] = rows.map((r) => ({
    x: dayLabel(r.at),
    y: r.diastolic,
  }));

  return { labels, systolic, diastolic };
}

/**
 * Adherence per calendar day for the last `days` days (ending today),
 * as a 0-100 percentage of expected plan items completed.
 * Defensive: 0% when nothing expected or no completions.
 */
export function adherenceByDay(
  completions: PlanCompletion[] | null | undefined,
  expectedItemCount: number,
  days: number,
): Bar[] {
  const n = Math.max(1, Math.floor(days));
  const expected = Math.max(0, Math.floor(expectedItemCount));

  // Count completed items per local day.
  const done = new Map<string, number>();
  for (const c of completions ?? []) {
    if (!c?.completed || !c.date) continue;
    const d = new Date(c.date);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    done.set(key, (done.get(key) ?? 0) + 1);
  }

  const out: Bar[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);
    const completed = done.get(key) ?? 0;
    const pct =
      expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0;
    out.push({
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: pct,
    });
  }
  return out;
}
