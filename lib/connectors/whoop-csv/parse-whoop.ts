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

export interface WhoopRow { marker: string; value: number; unit: string; optimal_low?: number; optimal_high?: number; category: string; collected_on: string }

export function parseWhoop(buf: Buffer): WhoopRow[] {
  const text = buf.toString("utf-8");
  const { data: rows, meta } = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  const headers = meta.fields ?? [];
  const results: WhoopRow[] = [];

  const dateCol = col(headers, ["Date", "Cycle Start", "Cycle end", "Sleep Start", "Start Time"]);

  for (const r of rows as RawRow[]) {
    const day = dateOnly(dateCol ? r[dateCol] : "");
    if (!day) continue;

    // Recovery sheet
    const recovery = num(r[col(headers, ["Recovery score %", "Recovery Score"]) ?? ""]);
    const hrv = num(r[col(headers, ["Heart Rate Variability (ms)", "HRV"]) ?? ""]);
    const rhr = num(r[col(headers, ["Resting Heart Rate (bpm)", "Resting Heart Rate"]) ?? ""]);
    const spo2 = num(r[col(headers, ["Blood Oxygen Saturation %", "SpO2"]) ?? ""]);
    const skinTemp = num(r[col(headers, ["Skin Temp", "Skin Temperature"]) ?? ""]);

    if (recovery != null) results.push({ collected_on: day, marker: "Whoop Recovery Score", value: recovery, unit: "%", optimal_low: 67, optimal_high: 100, category: "Recovery (Whoop)" });
    if (hrv != null) results.push({ collected_on: day, marker: "Whoop HRV (RMSSD)", value: hrv, unit: "ms", optimal_low: 50, optimal_high: 120, category: "Recovery (Whoop)" });
    if (rhr != null) results.push({ collected_on: day, marker: "Whoop Resting HR", value: rhr, unit: "bpm", optimal_low: 45, optimal_high: 65, category: "Recovery (Whoop)" });
    if (spo2 != null) results.push({ collected_on: day, marker: "Whoop SpO2", value: spo2, unit: "%", optimal_low: 95, optimal_high: 100, category: "Recovery (Whoop)" });
    if (skinTemp != null) results.push({ collected_on: day, marker: "Whoop Skin Temp", value: skinTemp, unit: "°C", category: "Recovery (Whoop)" });

    // Sleep sheet
    const sleepScore = num(r[col(headers, ["Sleep performance %", "Sleep Score"]) ?? ""]);
    const hoursSlept = num(r[col(headers, ["Hours of sleep", "Sleep Duration"]) ?? ""]);
    const sleepEff = num(r[col(headers, ["Sleep efficiency %", "Sleep Efficiency"]) ?? ""]);
    const remPct = num(r[col(headers, ["REM sleep duration (min)", "REM"]) ?? ""]);
    const deepPct = num(r[col(headers, ["Slow wave sleep duration (min)", "Deep Sleep", "SWS duration (min)"]) ?? ""]);

    if (sleepScore != null) results.push({ collected_on: day, marker: "Whoop Sleep Score", value: sleepScore, unit: "%", optimal_low: 70, optimal_high: 100, category: "Sleep (Whoop)" });
    if (hoursSlept != null) results.push({ collected_on: day, marker: "Whoop Sleep Duration", value: Math.round(hoursSlept * 60), unit: "min", optimal_low: 420, optimal_high: 540, category: "Sleep (Whoop)" });
    if (sleepEff != null) results.push({ collected_on: day, marker: "Whoop Sleep Efficiency", value: sleepEff, unit: "%", optimal_low: 85, optimal_high: 100, category: "Sleep (Whoop)" });
    if (remPct != null) results.push({ collected_on: day, marker: "Whoop REM Sleep", value: remPct, unit: "min", optimal_low: 90, optimal_high: 120, category: "Sleep (Whoop)" });
    if (deepPct != null) results.push({ collected_on: day, marker: "Whoop Deep Sleep", value: deepPct, unit: "min", optimal_low: 60, optimal_high: 120, category: "Sleep (Whoop)" });

    // Strain sheet
    const strain = num(r[col(headers, ["Day Strain", "Strain"]) ?? ""]);
    const avgHr = num(r[col(headers, ["Average Heart Rate (bpm)", "Avg HR"]) ?? ""]);
    const calories = num(r[col(headers, ["Calories", "Kilojoules"]) ?? ""]);

    if (strain != null) results.push({ collected_on: day, marker: "Whoop Strain Score", value: strain, unit: "score", optimal_low: 8, optimal_high: 14, category: "Strain (Whoop)" });
    if (avgHr != null) results.push({ collected_on: day, marker: "Whoop Avg Heart Rate", value: avgHr, unit: "bpm", category: "Strain (Whoop)" });
    if (calories != null) results.push({ collected_on: day, marker: "Whoop Calories Burned", value: calories, unit: "kcal", category: "Strain (Whoop)" });
  }

  return results;
}
