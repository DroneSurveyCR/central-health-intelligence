import Papa from "papaparse";

export interface LabCsvRow {
  marker: string;
  value: number;
  unit?: string;
  optimal_low?: number;
  optimal_high?: number;
  category?: string;
  collected_on?: string;
}

// Flexible column aliases — handles different lab export formats.
const MARKER_COLS  = ["marker", "test", "name", "analyte", "test name", "parameter"];
const VALUE_COLS   = ["value", "result", "result value", "measured"];
const UNIT_COLS    = ["unit", "units", "uom"];
const LOW_COLS     = ["optimal_low", "low", "lower", "min", "reference low", "optimal low"];
const HIGH_COLS    = ["optimal_high", "high", "upper", "max", "reference high", "optimal high"];
const CAT_COLS     = ["category", "panel", "group", "section"];
const DATE_COLS    = ["collected_on", "date", "collected", "sample date", "test date"];

function pick(row: Record<string, string>, cols: string[]): string | undefined {
  const rowLower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]));
  for (const c of cols) { const v = rowLower[c]; if (v != null && v !== "") return v; }
  return undefined;
}

function toNum(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseFloat(s.replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? undefined : n;
}

export function parseCsv(buf: Buffer): LabCsvRow[] {
  const text = buf.toString("utf-8");
  const { data } = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return data.flatMap((row) => {
    const marker = pick(row, MARKER_COLS);
    const valueStr = pick(row, VALUE_COLS);
    const value = toNum(valueStr);
    if (!marker || value == null) return [];
    return [{
      marker: marker.trim(),
      value,
      unit:         pick(row, UNIT_COLS),
      optimal_low:  toNum(pick(row, LOW_COLS)),
      optimal_high: toNum(pick(row, HIGH_COLS)),
      category:     pick(row, CAT_COLS),
      collected_on: pick(row, DATE_COLS),
    }];
  });
}
