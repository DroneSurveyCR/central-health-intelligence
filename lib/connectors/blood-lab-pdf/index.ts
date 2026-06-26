import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { extractText } from "./extract-text";
import { generateText } from "@/lib/ai";

const SYSTEM = `You are a medical data parser. Extract lab results from PDF text and return ONLY valid JSON.`;

interface LabRow { marker: string; value: number; unit: string; optimal_low?: number; optimal_high?: number; category?: string; collected_on?: string; }

async function parseWithAI(text: string): Promise<LabRow[]> {
  const prompt = `Extract every lab marker from this report. Return ONLY a JSON array:
[{ "marker": "Glucose", "value": 95, "unit": "mg/dL", "optimal_low": 70, "optimal_high": 99, "category": "Metabolic", "collected_on": "2024-01-15" }]
- value must be a number (strip units from the value field)
- optimal_low / optimal_high are the OPTIMAL ranges (not just normal), use functional medicine ranges if available
- collected_on: YYYY-MM-DD format, null if not found
- category: one of Metabolic, Hormones, Thyroid, Liver, Kidney, Lipids, Blood, Nutrients, Inflammation, Other

PDF text:
${text.slice(0, 5000)}`;

  const raw = await generateText({ system: SYSTEM, prompt, maxTokens: 1200 });
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("AI returned no JSON array");
  return JSON.parse(match[0]) as LabRow[];
}

export const bloodLabPdf: ConnectorModule = {
  id: "blood_lab_pdf",
  label: "Blood Lab Report (PDF)",
  accepts: ["application/pdf"],
  targetTable: "lab_results",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rawText = await extractText(input.fileBuffer);
    if (!rawText.trim()) throw new Error("Could not extract text from PDF.");
    const rows = await parseWithAI(rawText);
    if (!rows.length) throw new Error("No lab markers found in this PDF.");
    return {
      rows: rows as unknown as Record<string, unknown>[],
      summary: `${rows.length} lab markers extracted.`,
      warnings: rows.filter((r) => !r.collected_on).length ? ["Some markers are missing a collection date — defaulting to today."] : [],
      rawText,
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
