import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { parseWhoop } from "./parse-whoop";

export const whoopCsv: ConnectorModule = {
  id: "whoop_csv",
  label: "Whoop (CSV)",
  accepts: ["text/csv", "text/plain"],
  targetTable: "lab_results",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rows = parseWhoop(input.fileBuffer);
    if (!rows.length) throw new Error("No Whoop data found. Export Recovery, Sleep, or Strain CSV from app.whoop.com → Account → Download My Data.");
    const days = new Set(rows.map((r) => r.collected_on)).size;
    const categories = [...new Set(rows.map((r) => r.category.replace(" (Whoop)", "")))];
    return {
      rows: rows as unknown as Record<string, unknown>[],
      summary: `${days} days of Whoop data — ${categories.join(", ")}.`,
    };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    const inserts = rows.map((r) => ({ ...r, patient_id: patientId, import_id: importId }));
    const { data, error } = await admin.from("lab_results").insert(inserts).select("id");
    if (error) throw new Error(error.message);
    return (data as { id: string }[]).map((r) => r.id);
  },
};
