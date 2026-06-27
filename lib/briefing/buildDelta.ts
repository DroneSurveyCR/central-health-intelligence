import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Doctor morning-briefing delta builder.
 *
 * Rule-based, NON-AI, NON-diagnostic. Computes "what CHANGED since last visit"
 * for a single patient by comparing the latest wearable day against the 7-day
 * average that precedes it, and surfacing recent abnormal / stale labs. Produces
 * a short summary, a list of delta strings, and 2–3 rule-based talking points.
 *
 * Degrades gracefully: with little or no data it returns an honest, empty-ish
 * result rather than throwing. Accepts any Supabase client (RLS server client
 * for live fallback, or service-role admin client from the cron). All queries
 * are keyed by patient_id, which the caller has already scoped to a tenant.
 */

export type BriefingResult = {
  summary: string;
  deltas: string[];
  talkingPoints: string[];
};

type WearableRow = {
  date: string;
  resting_hr: number | null;
  hrv_ms: number | null;
  sleep_hours: number | null;
  steps: number | null;
  readiness_score: number | null;
  weight_kg: number | null;
  avg_glucose_mgdl: number | null;
};

type LabRow = {
  marker: string;
  value: number | null;
  unit: string | null;
  optimal_low: number | null;
  optimal_high: number | null;
  collected_on: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pctChange(now: number, base: number): number | null {
  if (base === 0) return null;
  return ((now - base) / Math.abs(base)) * 100;
}

function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Collects non-null values of one metric from a set of rows. */
function pick(rows: WearableRow[], key: keyof WearableRow): number[] {
  const out: number[] = [];
  for (const r of rows) {
    const v = r[key];
    if (typeof v === "number" && Number.isFinite(v)) out.push(v);
  }
  return out;
}

/**
 * Describe a single metric's change vs its 7-day baseline. Returns a delta
 * string (or null if there isn't enough data). `dir` says which direction is
 * notable for talking points; the string itself is purely descriptive.
 */
function metricDelta(opts: {
  label: string;
  unit: string;
  latest: number | null;
  baseline: number | null;
  dp?: number;
  /** Minimum absolute change to bother reporting. */
  minAbs?: number;
}): { text: string; deltaPct: number | null; absChange: number | null } | null {
  const { label, unit, latest, baseline, dp = 0, minAbs = 0 } = opts;
  if (latest == null) return null;
  if (baseline == null) {
    // Have a current reading but no baseline — report the level only.
    return { text: `${label} ${round(latest, dp)}${unit}`, deltaPct: null, absChange: null };
  }
  const absChange = latest - baseline;
  const pct = pctChange(latest, baseline);
  if (Math.abs(absChange) < minAbs) {
    return { text: `${label} steady at ${round(latest, dp)}${unit}`, deltaPct: 0, absChange: 0 };
  }
  const dirWord = absChange > 0 ? "up" : "down";
  const pctStr = pct == null ? "" : `, ${dirWord} ${Math.abs(round(pct))}% vs 7-day avg`;
  const absStr =
    pct == null
      ? `, ${dirWord} ${round(Math.abs(absChange), dp)}${unit} vs 7-day avg`
      : "";
  return {
    text: `${label} ${round(latest, dp)}${unit}${pctStr}${absStr}`,
    deltaPct: pct,
    absChange,
  };
}

export async function buildDelta(
  client: SupabaseClient,
  patientId: string,
): Promise<BriefingResult> {
  // --- Wearables: latest day + the prior 7-day window --------------------------
  const { data: wData } = await client
    .from("wearable_daily_summaries")
    .select(
      "date, resting_hr, hrv_ms, sleep_hours, steps, readiness_score, weight_kg, avg_glucose_mgdl",
    )
    .eq("patient_id", patientId)
    .order("date", { ascending: false })
    .limit(30);

  const wearables = (wData ?? []) as WearableRow[];
  const deltas: string[] = [];
  const talkingPoints: string[] = [];

  if (wearables.length > 0) {
    const latest = wearables[0];
    const latestTime = new Date(latest.date).getTime();
    // Baseline = the 7 days immediately preceding the latest reading.
    const baselineRows = wearables.filter((r) => {
      const t = new Date(r.date).getTime();
      return t < latestTime && t >= latestTime - 7 * DAY_MS;
    });

    const staleDays = Math.floor((Date.now() - latestTime) / DAY_MS);
    if (staleDays > 2) {
      deltas.push(`Wearable data last synced ${staleDays} days ago (${latest.date}).`);
    }

    const specs: Array<{
      key: keyof WearableRow;
      label: string;
      unit: string;
      dp?: number;
      minAbs?: number;
    }> = [
      { key: "hrv_ms", label: "HRV", unit: "ms", minAbs: 2 },
      { key: "resting_hr", label: "Resting HR", unit: " bpm", minAbs: 2 },
      { key: "sleep_hours", label: "Sleep", unit: "h", dp: 1, minAbs: 0.5 },
      { key: "readiness_score", label: "Readiness", unit: "", minAbs: 3 },
      { key: "steps", label: "Steps", unit: "", minAbs: 1000 },
      { key: "weight_kg", label: "Weight", unit: "kg", dp: 1, minAbs: 0.5 },
      { key: "avg_glucose_mgdl", label: "Avg glucose", unit: " mg/dL", minAbs: 5 },
    ];

    for (const spec of specs) {
      const baseVals = pick(baselineRows, spec.key);
      const latestVal = latest[spec.key];
      const d = metricDelta({
        label: spec.label,
        unit: spec.unit,
        latest: typeof latestVal === "number" ? latestVal : null,
        baseline: avg(baseVals),
        dp: spec.dp,
        minAbs: spec.minAbs,
      });
      if (d) deltas.push(d.text);

      // Rule-based talking points (non-diagnostic) for notable swings.
      if (d && d.deltaPct != null) {
        if (spec.key === "hrv_ms" && d.deltaPct <= -15) {
          talkingPoints.push(
            "HRV is down meaningfully from baseline — ask about sleep, stress, alcohol or illness.",
          );
        }
        if (spec.key === "resting_hr" && d.absChange != null && d.absChange >= 5) {
          talkingPoints.push(
            "Resting HR has climbed several bpm — worth checking recovery, hydration and recent training load.",
          );
        }
        if (spec.key === "avg_glucose_mgdl" && d.absChange != null && d.absChange >= 10) {
          talkingPoints.push(
            "Average glucose has risen vs the prior week — review diet, meds adherence and timing.",
          );
        }
      }
      // Weight "flat for N weeks" framing when steady across the whole window.
      if (spec.key === "weight_kg" && d && d.absChange === 0) {
        const weightDays = pick(wearables, "weight_kg").length;
        if (weightDays >= 14) {
          deltas[deltas.length - 1] = `Weight flat ~${Math.floor(weightDays / 7)} weeks at ${round(
            latest.weight_kg ?? 0,
            1,
          )}kg`;
        }
      }
    }
  } else {
    deltas.push("No wearable data on file yet.");
  }

  // --- Labs: recent abnormal (outside optimal range) + staleness ---------------
  const { data: lData } = await client
    .from("lab_results")
    .select("marker, value, unit, optimal_low, optimal_high, collected_on")
    .eq("patient_id", patientId)
    .order("collected_on", { ascending: false })
    .limit(40);

  const labs = (lData ?? []) as LabRow[];
  if (labs.length > 0) {
    // Most recent result per marker.
    const latestByMarker = new Map<string, LabRow>();
    for (const l of labs) {
      if (!latestByMarker.has(l.marker)) latestByMarker.set(l.marker, l);
    }

    const abnormal: string[] = [];
    for (const l of latestByMarker.values()) {
      if (l.value == null) continue;
      const low = l.optimal_low;
      const high = l.optimal_high;
      const below = low != null && l.value < low;
      const above = high != null && l.value > high;
      if (below || above) {
        const unit = l.unit ? ` ${l.unit}` : "";
        abnormal.push(`${l.marker} ${l.value}${unit} (${below ? "below" : "above"} optimal, ${l.collected_on})`);
      }
    }
    if (abnormal.length > 0) {
      deltas.push(`Recent abnormal labs: ${abnormal.slice(0, 4).join("; ")}.`);
      talkingPoints.push(
        `Discuss ${abnormal.length} out-of-range lab marker${abnormal.length === 1 ? "" : "s"} flagged at last draw.`,
      );
    }

    // Labs "due": newest lab older than ~6 months.
    const newest = labs[0];
    const labAgeDays = Math.floor((Date.now() - new Date(newest.collected_on).getTime()) / DAY_MS);
    if (labAgeDays > 180) {
      deltas.push(`Labs may be due — most recent panel is ${Math.floor(labAgeDays / 30)} months old (${newest.collected_on}).`);
      talkingPoints.push("Labs are over 6 months old — consider ordering a refresh.");
    }
  }

  // --- Summary line ------------------------------------------------------------
  let summary: string;
  if (deltas.length === 0 || (wearables.length === 0 && labs.length === 0)) {
    summary = "Limited recent data — nothing notable changed since the last visit.";
  } else {
    const notable = deltas.filter(
      (d) => !d.startsWith("No ") && !d.includes("steady at") && !d.includes("flat"),
    );
    summary =
      notable.length > 0
        ? `${notable.length} change${notable.length === 1 ? "" : "s"} since last visit. ${notable[0]}.`
        : "Metrics stable since the last visit.";
  }

  // Cap talking points at 3; ensure at least one when we have any data.
  if (talkingPoints.length === 0 && (wearables.length > 0 || labs.length > 0)) {
    talkingPoints.push("No flagged changes — confirm how the patient feels and review goals.");
  }

  return { summary, deltas, talkingPoints: talkingPoints.slice(0, 3) };
}
