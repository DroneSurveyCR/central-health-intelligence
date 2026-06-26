import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { parseHrv } from "./parse-hrv";

export const hrvCsv: ConnectorModule = {
  id: "hrv_csv",
  label: "HRV / Heart Rate (CSV)",
  accepts: ["text/csv", "text/plain"],
  targetTable: "lab_results",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rows = parseHrv(input.fileBuffer);
    if (!rows.length) throw new Error("No HRV data found. Accepts exports from Polar, Elite HRV, HRV4Training, or any CSV with RMSSD, HRV, or RHR columns.");
    const days = new Set(rows.map((r) => r.collected_on)).size;
    const rmssdRows = rows.filter((r) => r.marker === "HRV RMSSD");
    const avgHrv = rmssdRows.length ? Math.round(rmssdRows.reduce((s, r) => s + r.value, 0) / rmssdRows.length) : null;
    return {
      rows: rows as unknown as Record<string, unknown>[],
      summary: `${days} days of HRV data${avgHrv ? ` · avg RMSSD ${avgHrv} ms` : ""}.`,
    };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    const inserts = rows.map((r) => ({ ...r, patient_id: patientId, import_id: importId }));
    const { data, error } = await admin.from("lab_results").insert(inserts).select("id");
    if (error) throw new Error(error.message);
    return (data as { id: string }[]).map((r) => r.id);
  },
};
