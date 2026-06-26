import Papa from "papaparse";

type RawRow = Record<string, string>;

function col(headers: string[], patterns: string[]): string | undefined {
  return headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p.toLowerCase())));
}
function num(v: string | undefined): number | null {
  const n = parseFloat(v ?? "");
  return isNaN(n) ? null : n;
}
function dateOnly(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export interface GarminRow { marker: string; value: number; unit: string; optimal_low?: number; optimal_high?: number; category: string; collected_on: string }

function detectSheet(headers: string[]): "activity" | "sleep" | "hrv" | "body" | "unknown" {
  const h = headers.map((s) => s.toLowerCase()).join(" ");
  if (h.includes("activity type") || h.includes("activity name")) return "activity";
  if (h.includes("sleep score") || h.includes("rem") || h.includes("deep sleep")) return "sleep";
  if (h.includes("hrv") || h.includes("rmssd")) return "hrv";
  if (h.includes("weight") || h.includes("bmi")) return "body";
  return "unknown";
}

export function parseGarmin(buf: Buffer): GarminRow[] {
  const text = buf.toString("utf-8");
  const { data: rows, meta } = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  const headers = meta.fields ?? [];
  const sheet = detectSheet(headers);
  const results: GarminRow[] = [];

  const dateCol = col(headers, ["Date", "Timestamp", "Start Time", "Time"]);

  for (const r of rows as RawRow[]) {
    const day = dateOnly(dateCol ? r[dateCol] : "");
    if (!day) continue;
    const base = { collected_on: day };

    if (sheet === "activity" || sheet === "unknown") {
      const steps = num(r[col(headers, ["Steps"]) ?? ""]);
      const calories = num(r[col(headers, ["Calories"]) ?? ""]);
      const avgHr = num(r[col(headers, ["Avg HR", "Average HR", "Avg Heart Rate"]) ?? ""]);
      const maxHr = num(r[col(headers, ["Max HR", "Max Heart Rate"]) ?? ""]);
      const distance = num(r[col(headers, ["Distance"]) ?? ""]);
      if (steps) results.push({ ...base, marker: "Garmin Steps", value: steps, unit: "steps", optimal_low: 7500, optimal_high: 15000, category: "Activity (Garmin)" });
      if (calories) results.push({ ...base, marker: "Garmin Active Calories", value: calories, unit: "kcal", category: "Activity (Garmin)" });
      if (avgHr) results.push({ ...base, marker: "Garmin Avg Heart Rate", value: avgHr, unit: "bpm", optimal_low: 50, optimal_high: 85, category: "Activity (Garmin)" });
      if (maxHr) results.push({ ...base, marker: "Garmin Max Heart Rate", value: maxHr, unit: "bpm", category: "Activity (Garmin)" });
      if (distance) results.push({ ...base, marker: "Garmin Distance", value: distance, unit: "km", category: "Activity (Garmin)" });
    }
    if (sheet === "sleep") {
      const score = num(r[col(headers, ["Sleep Score", "Overall Sleep Score"]) ?? ""]);
      const deep = num(r[col(headers, ["Deep Sleep", "Deep"]) ?? ""]);
      const rem = num(r[col(headers, ["REM Sleep", "REM"]) ?? ""]);
      const total = num(r[col(headers, ["Total Sleep", "Sleep Time"]) ?? ""]);
      const spo2 = num(r[col(headers, ["SpO2", "Avg SpO2"]) ?? ""]);
      const resp = num(r[col(headers, ["Respiration", "Avg Respiration"]) ?? ""]);
      if (score) results.push({ ...base, marker: "Garmin Sleep Score", value: score, unit: "score", optimal_low: 70, optimal_high: 100, category: "Sleep (Garmin)" });
      if (deep) results.push({ ...base, marker: "Garmin Deep Sleep", value: deep, unit: "min", optimal_low: 60, optimal_high: 120, category: "Sleep (Garmin)" });
      if (rem) results.push({ ...base, marker: "Garmin REM Sleep", value: rem, unit: "min", optimal_low: 90, optimal_high: 120, category: "Sleep (Garmin)" });
      if (total) results.push({ ...base, marker: "Garmin Total Sleep", value: total, unit: "min", optimal_low: 420, optimal_high: 540, category: "Sleep (Garmin)" });
      if (spo2) results.push({ ...base, marker: "Garmin SpO2", value: spo2, unit: "%", optimal_low: 95, optimal_high: 100, category: "Sleep (Garmin)" });
      if (resp) results.push({ ...base, marker: "Garmin Respiration Rate", value: resp, unit: "breaths/min", optimal_low: 12, optimal_high: 18, category: "Sleep (Garmin)" });
    }
    if (sheet === "hrv") {
      const hrv = num(r[col(headers, ["HRV", "RMSSD", "Last Night HRV", "Avg HRV"]) ?? ""]);
      if (hrv) results.push({ ...base, marker: "Garmin HRV (RMSSD)", value: hrv, unit: "ms", optimal_low: 50, optimal_high: 120, category: "HRV (Garmin)" });
    }
    if (sheet === "body") {
      const weight = num(r[col(headers, ["Weight"]) ?? ""]);
      const bmi = num(r[col(headers, ["BMI"]) ?? ""]);
      if (weight) results.push({ ...base, marker: "Garmin Weight", value: weight, unit: "kg", category: "Body (Garmin)" });
      if (bmi) results.push({ ...base, marker: "Garmin BMI", value: bmi, unit: "kg/m²", optimal_low: 18.5, optimal_high: 24.9, category: "Body (Garmin)" });
    }
  }
  return results;
}
