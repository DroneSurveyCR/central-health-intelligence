import Papa from "papaparse";

/**
 * Map of summary column -> accepted header aliases (already trimmed + lowercased).
 * The first alias found in a row wins.
 */
const FIELD_ALIASES: Record<string, string[]> = {
  resting_hr: ["resting_hr", "rhr", "resting heart rate"],
  hrv_ms: ["hrv", "hrv_ms", "rmssd"],
  sleep_hours: ["sleep_hours", "sleep"],
  steps: ["steps"],
  readiness_score: ["readiness", "readiness_score"],
  spo2_avg: ["spo2", "spo2_avg"],
  weight_kg: ["weight_kg", "weight"],
  body_fat_pct: ["body_fat_pct", "body fat"],
  avg_glucose_mgdl: ["avg_glucose", "glucose", "avg_glucose_mgdl"],
  time_in_range_pct: ["time_in_range_pct", "tir"],
};

const DATE_ALIASES = ["date", "day"];

/** Pull the first present, non-empty value among the given aliases. */
function pick(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const a of aliases) {
    const v = row[a];
    if (v != null && String(v).trim() !== "") return v;
  }
  return undefined;
}

/** Coerce to a finite number, or null when absent/unparseable. */
function num(v: unknown): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/** Normalize a date cell to YYYY-MM-DD, or null when unparseable. */
function toIsoDate(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  // Already YYYY-MM-DD (optionally with a time component).
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Parse a wearable/CGM CSV export into rows shaped for wearable_daily_summaries.
 * Flexible column-name matching; rows without a parseable date are skipped.
 * Numeric fields absent/empty in a row are omitted (not set to null).
 */
export function parseWearableCsv(
  text: string,
  connectorSlug: string,
  patientId: string,
): Record<string, unknown>[] {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const out: Record<string, unknown>[] = [];
  const rows = Array.isArray(parsed.data) ? parsed.data : [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const date = toIsoDate(pick(row, DATE_ALIASES));
    if (!date) continue;

    const mapped: Record<string, unknown> = {
      patient_id: patientId,
      connector_slug: connectorSlug,
      date,
      raw_payload: row,
    };

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      const n = num(pick(row, aliases));
      if (n !== null) {
        // steps and readiness_score are integer columns — round to avoid insert errors.
        mapped[field] = field === "steps" || field === "readiness_score" ? Math.round(n) : n;
      }
    }

    out.push(mapped);
  }

  return out;
}
