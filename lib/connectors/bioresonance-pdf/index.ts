import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { extractText } from "./extract-text";
import { generateText } from "@/lib/ai";

const SYSTEM = `You are a medical data parser for an integrative medicine clinic.
Extract bioresonance scan findings from the provided PDF text and return ONLY a JSON object.`;

async function parseWithAI(text: string, patient: ParseInput["patient"]): Promise<Record<string, unknown>> {
  const prompt = `Parse this bioresonance scan report for patient ${patient.firstName} ${patient.lastName}.
Return a JSON object with this exact shape:
{
  "scan_type": "bioresonance",
  "findings": { "<system_or_organ>": { "score": <0-10 or null>, "note": "<finding text or null>" } },
  "overall_note": "<overall practitioner summary or null>"
}
Systems/organs to look for: skin, inflammation, elasticity, viscosity, lipids, cardiovascular, respiratory, liver, kidneys, gut, spleen, cognition, nervous, bone.
Only include systems actually mentioned in the report.

PDF text:
${text.slice(0, 4000)}`;

  const raw = await generateText({ system: SYSTEM, prompt, maxTokens: 800 });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned no JSON object");
  return JSON.parse(match[0]);
}

export const bioresonancePdf: ConnectorModule = {
  id: "bioresonance_pdf",
  label: "Bioresonance Scan PDF",
  accepts: ["application/pdf"],
  targetTable: "scans",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rawText = await extractText(input.fileBuffer);
    if (!rawText.trim()) throw new Error("Could not extract text from PDF. Is it a scanned image?");
    const parsed = await parseWithAI(rawText, input.patient);
    return {
      rows: [{ scan_type: "bioresonance", parsed_findings: parsed, parse_status: "complete" }],
      summary: (parsed.overall_note as string) ?? `Bioresonance scan parsed — ${Object.keys((parsed.findings as object) ?? {}).length} systems extracted.`,
      rawText,
    };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    const row = rows[0] ?? {};
    const { data, error } = await admin
      .from("scans")
      .insert({ ...row, patient_id: patientId, import_id: importId, scan_date: new Date().toISOString().slice(0, 10) })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return [data.id];
  },
};
