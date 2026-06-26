import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { parseNutrition } from "./parse-nutrition";

export const nutritionCsv: ConnectorModule = {
  id: "nutrition_csv",
  label: "Nutrition / Food Diary (CSV)",
  accepts: ["text/csv", "text/plain"],
  targetTable: "lab_results",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rows = parseNutrition(input.fileBuffer);
    if (!rows.length) throw new Error("No nutrition data found. Accepts Cronometer and MyFitnessPal CSV exports. Ensure the export includes a Date column and nutrient columns.");
    const days = new Set(rows.map((r) => r.collected_on)).size;
    const calorieRows = rows.filter((r) => r.marker === "Energy");
    const avgCals = calorieRows.length ? Math.round(calorieRows.reduce((s, r) => s + r.value, 0) / calorieRows.length) : null;
    return {
      rows: rows as unknown as Record<string, unknown>[],
      summary: `${days} day${days !== 1 ? "s" : ""} of nutrition data · ${rows.length} data points${avgCals ? ` · avg ${avgCals} kcal/day` : ""}.`,
    };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    const inserts = rows.map((r) => ({ ...r, patient_id: patientId, import_id: importId }));
    const { data, error } = await admin.from("lab_results").insert(inserts).select("id");
    if (error) throw new Error(error.message);
    return (data as { id: string }[]).map((r) => r.id);
  },
};
