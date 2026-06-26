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

export interface HrvRow { marker: string; value: number; unit: string; optimal_low?: number; optimal_high?: number; category: string; collected_on: string }

export function parseHrv(buf: Buffer): HrvRow[] {
  const text = buf.toString("utf-8");
  const { data: rows, meta } = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  const headers = meta.fields ?? [];
  const results: HrvRow[] = [];

  const dateCol = col(headers, ["Date", "Timestamp", "Time", "Day"]);

  for (const r of rows as RawRow[]) {
    const day = dateOnly(dateCol ? r[dateCol] : "");
    if (!day) continue;

    const rmssd    = num(r[col(headers, ["RMSSD", "HRV", "HRV4Training", "Morning HRV"]) ?? ""]);
    const sdnn     = num(r[col(headers, ["SDNN"]) ?? ""]);
    const lnRmssd  = num(r[col(headers, ["lnRMSSD", "ln(RMSSD)"]) ?? ""]);
    const rhr      = num(r[col(headers, ["Resting HR", "RHR", "Resting Heart Rate", "Avg HR"]) ?? ""]);
    const stress   = num(r[col(headers, ["Stress", "Stress Score"]) ?? ""]);
    const readiness = num(r[col(headers, ["Readiness", "Readiness Score", "Training Readiness"]) ?? ""]);

    if (rmssd != null)    results.push({ collected_on: day, marker: "HRV RMSSD", value: rmssd, unit: "ms", optimal_low: 50, optimal_high: 120, category: "HRV" });
    if (sdnn != null)     results.push({ collected_on: day, marker: "HRV SDNN", value: sdnn, unit: "ms", optimal_low: 50, optimal_high: 100, category: "HRV" });
    if (lnRmssd != null)  results.push({ collected_on: day, marker: "HRV ln(RMSSD)", value: lnRmssd, unit: "ms", category: "HRV" });
    if (rhr != null)      results.push({ collected_on: day, marker: "Resting Heart Rate", value: rhr, unit: "bpm", optimal_low: 45, optimal_high: 65, category: "HRV" });
    if (stress != null)   results.push({ collected_on: day, marker: "Stress Score", value: stress, unit: "score", optimal_low: 0, optimal_high: 25, category: "HRV" });
    if (readiness != null) results.push({ collected_on: day, marker: "Training Readiness", value: readiness, unit: "score", optimal_low: 67, optimal_high: 100, category: "HRV" });
  }

  return results;
}
