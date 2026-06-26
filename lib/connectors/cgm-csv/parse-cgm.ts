import Papa from "papaparse";

export interface GlucoseDaySummary {
  collected_on: string;
  marker: string;
  value: number;
  unit: string;
  optimal_low?: number;
  optimal_high?: number;
  category: string;
}

type RawRow = Record<string, string>;

function detectFormat(headers: string[]): "dexcom" | "libre" | "generic" {
  const h = headers.map((s) => s.toLowerCase());
  if (h.some((s) => s.includes("glucose value"))) return "dexcom";
  if (h.some((s) => s.includes("historic glucose") || s.includes("scan glucose"))) return "libre";
  return "generic";
}

function findCol(headers: string[], patterns: string[]): string | undefined {
  return headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p.toLowerCase())));
}

function parseDate(s: string): string | null {
  const m = s.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function toMgDl(value: number, unit: string): number {
  if (unit.toLowerCase().includes("mmol")) return Math.round(value * 18.0182);
  return value;
}

export function parseCgm(buf: Buffer): GlucoseDaySummary[] {
  const text = buf.toString("utf-8");
  const { data: rows, meta } = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  const headers = meta.fields ?? [];
  const format = detectFormat(headers);

  let dateCol: string | undefined;
  let valueCol: string | undefined;
  let unitHint = "mg/dL";

  if (format === "dexcom") {
    dateCol = findCol(headers, ["Timestamp"]);
    valueCol = findCol(headers, ["Glucose Value"]);
    unitHint = "mg/dL";
  } else if (format === "libre") {
    dateCol = findCol(headers, ["Device Timestamp", "Timestamp"]);
    valueCol = findCol(headers, ["Historic Glucose", "Scan Glucose"]);
    // Libre can be mmol/L — check header
    const valueHeader = valueCol ?? "";
    unitHint = valueHeader.toLowerCase().includes("mmol") ? "mmol/L" : "mg/dL";
  } else {
    dateCol = findCol(headers, ["date", "time", "timestamp"]);
    valueCol = findCol(headers, ["glucose", "value", "reading", "bg"]);
  }

  if (!dateCol || !valueCol) return [];

  // Group readings by day
  const byDay = new Map<string, number[]>();
  for (const row of rows as RawRow[]) {
    const rawDate = row[dateCol];
    const rawVal = row[valueCol];
    const day = parseDate(rawDate ?? "");
    const num = parseFloat(rawVal ?? "");
    if (!day || isNaN(num) || num <= 0) continue;
    const mgDl = toMgDl(num, unitHint);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(mgDl);
  }

  const summaries: GlucoseDaySummary[] = [];
  for (const [day, readings] of byDay) {
    const avg = Math.round(readings.reduce((a, b) => a + b, 0) / readings.length);
    const min = Math.min(...readings);
    const max = Math.max(...readings);
    const tir = Math.round((readings.filter((v) => v >= 70 && v <= 140).length / readings.length) * 100);
    const base = { collected_on: day, unit: "mg/dL", optimal_low: 70, optimal_high: 100, category: "Glucose (CGM)" };
    summaries.push({ ...base, marker: "CGM Average Glucose", value: avg });
    summaries.push({ ...base, marker: "CGM Min Glucose", value: min, optimal_low: undefined, optimal_high: undefined });
    summaries.push({ ...base, marker: "CGM Max Glucose", value: max, optimal_low: undefined, optimal_high: undefined });
    summaries.push({ ...base, marker: "CGM Time In Range (%)", value: tir, unit: "%", optimal_low: 70, optimal_high: 100 });
  }

  return summaries.sort((a, b) => a.collected_on.localeCompare(b.collected_on));
}
