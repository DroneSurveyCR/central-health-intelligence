import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { parseCgm } from "./parse-cgm";

export const cgmCsv: ConnectorModule = {
  id: "cgm_csv",
  label: "CGM / Glucose Monitor (CSV)",
  accepts: ["text/csv", "text/plain"],
  targetTable: "lab_results",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rows = parseCgm(input.fileBuffer);
    if (!rows.length) throw new Error("No glucose readings found. Accepts Dexcom Clarity and LibreView CSV exports.");
    const days = new Set(rows.map((r) => r.collected_on)).size;
    const avgRows = rows.filter((r) => r.marker === "CGM Average Glucose");
    const overallAvg = avgRows.length
      ? Math.round(avgRows.reduce((s, r) => s + r.value, 0) / avgRows.length)
      : null;
    return {
      rows: rows as unknown as Record<string, unknown>[],
      summary: `${days} day${days !== 1 ? "s" : ""} of CGM data parsed${overallAvg ? ` · avg glucose ${overallAvg} mg/dL` : ""}.`,
    };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    const inserts = rows.map((r) => ({ ...r, patient_id: patientId, import_id: importId }));
    const { data, error } = await admin.from("lab_results").insert(inserts).select("id");
    if (error) throw new Error(error.message);
    return (data as { id: string }[]).map((r) => r.id);
  },
};
