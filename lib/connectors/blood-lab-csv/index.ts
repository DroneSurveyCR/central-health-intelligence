import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { parseCsv } from "./parse-csv";

export const bloodLabCsv: ConnectorModule = {
  id: "blood_lab_csv",
  label: "Blood Lab Report (CSV)",
  accepts: ["text/csv", "text/plain"],
  targetTable: "lab_results",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rows = parseCsv(input.fileBuffer);
    if (!rows.length) throw new Error("No lab markers found. Check column names match: marker, value, unit, optimal_low, optimal_high, collected_on.");
    const missing = rows.filter((r) => !r.collected_on);
    return {
      rows: rows as unknown as Record<string, unknown>[],
      summary: `${rows.length} lab markers parsed from CSV.`,
      warnings: missing.length ? [`${missing.length} rows missing collection date — will default to today.`] : [],
    };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    const today = new Date().toISOString().slice(0, 10);
    const inserts = rows.map((r) => ({ ...r, patient_id: patientId, import_id: importId, collected_on: r.collected_on ?? today }));
    const { data, error } = await admin.from("lab_results").insert(inserts).select("id");
    if (error) throw new Error(error.message);
    return (data as { id: string }[]).map((r) => r.id);
  },
};
