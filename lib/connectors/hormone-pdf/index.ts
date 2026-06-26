import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { extractText } from "./extract-text";
import { generateText } from "@/lib/ai";

const SYSTEM = `You are a functional medicine data parser. Extract hormone and endocrine lab markers from PDF text and return ONLY valid JSON.`;

interface HormoneRow {
  marker: string;
  value: number;
  unit: string;
  optimal_low?: number;
  optimal_high?: number;
  category: string;
  collected_on?: string;
}

async function parseWithAI(text: string): Promise<HormoneRow[]> {
  const prompt = `Extract every hormone and endocrine marker from this lab report using FUNCTIONAL MEDICINE optimal ranges (stricter than conventional).
Return ONLY a JSON array:
[
  { "marker": "Estradiol", "value": 85, "unit": "pg/mL", "optimal_low": 80, "optimal_high": 200, "category": "Sex Hormones", "collected_on": "2024-01-15" }
]

Categories to use:
- "Sex Hormones": estradiol, estriol, estrone, progesterone, testosterone (total/free/bioavailable), DHEA, DHEA-S, androstenedione, SHBG
- "Adrenal": cortisol (AM/PM/4-point), DHEA-S (also sex), aldosterone, epinephrine, norepinephrine
- "Thyroid": TSH, free T3, free T4, total T3, total T4, reverse T3, TPO antibodies, thyroglobulin antibodies
- "Metabolic Hormones": insulin, fasting glucose, HbA1c, leptin, adiponectin, ghrelin, IGF-1, growth hormone
- "Peptide": LH, FSH, prolactin, oxytocin, melatonin, PTH

Rules:
- value must be numeric (strip units, use the number only)
- optimal ranges = functional medicine ranges, NOT conventional lab ranges
- collected_on: YYYY-MM-DD, null if not stated
- For cortisol multi-point tests, include each time point as a separate row with marker "Cortisol AM", "Cortisol Noon", etc.
- For Dutch/DUTCH tests, include metabolites if present

PDF text:
${text.slice(0, 6000)}`;

  const raw = await generateText({ system: SYSTEM, prompt, maxTokens: 1500 });
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("AI returned no JSON array");
  return JSON.parse(match[0]) as HormoneRow[];
}

export const hormonePdf: ConnectorModule = {
  id: "hormone_pdf",
  label: "Hormone / Dutch Test (PDF)",
  accepts: ["application/pdf"],
  targetTable: "lab_results",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rawText = await extractText(input.fileBuffer);
    if (!rawText.trim()) throw new Error("Could not extract text from PDF.");
    const rows = await parseWithAI(rawText);
    if (!rows.length) throw new Error("No hormone markers found in this PDF.");
    const missing = rows.filter((r) => !r.collected_on);
    return {
      rows: rows as unknown as Record<string, unknown>[],
      summary: `${rows.length} hormone markers extracted.`,
      warnings: missing.length ? [`${missing.length} markers missing collection date — defaulting to today.`] : [],
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
