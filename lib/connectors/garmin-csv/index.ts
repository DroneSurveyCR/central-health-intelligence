import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { parseGarmin } from "./parse-garmin";

export const garminCsv: ConnectorModule = {
  id: "garmin_csv",
  label: "Garmin Connect (CSV)",
  accepts: ["text/csv", "text/plain"],
  targetTable: "lab_results",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rows = parseGarmin(input.fileBuffer);
    if (!rows.length) throw new Error("No Garmin data found. Export Activity, Sleep, HRV, or Body composition CSV from Garmin Connect.");
    const days = new Set(rows.map((r) => r.collected_on)).size;
    const category = rows[0]?.category ?? "Garmin";
    return {
      rows: rows as unknown as Record<string, unknown>[],
      summary: `${rows.length} metrics across ${days} day${days !== 1 ? "s" : ""} (${category}).`,
    };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    const inserts = rows.map((r) => ({ ...r, patient_id: patientId, import_id: importId }));
    const { data, error } = await admin.from("lab_results").insert(inserts).select("id");
    if (error) throw new Error(error.message);
    return (data as { id: string }[]).map((r) => r.id);
  },
};
