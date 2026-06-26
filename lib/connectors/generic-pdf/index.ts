import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { extractText } from "./extract-text";
import { generateText } from "@/lib/ai";

export const genericPdf: ConnectorModule = {
  id: "generic_pdf",
  label: "Generic Health PDF",
  accepts: ["application/pdf"],
  targetTable: "scans",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rawText = await extractText(input.fileBuffer);
    if (!rawText.trim()) throw new Error("Could not extract text from PDF.");

    const summary = await generateText({
      system: "You are a clinical data parser. Extract the most clinically relevant health findings from this document.",
      prompt: `Extract key health findings from this document for patient ${input.patient.firstName} ${input.patient.lastName}.
Return a JSON object:
{
  "scan_type": "generic",
  "findings": { "<finding_name>": { "value": "<value>", "note": "<context>" } },
  "overall_note": "<1-2 sentence summary>"
}
Only include findings that are clinically relevant. Respond with JSON only.

Document text:
${rawText.slice(0, 5000)}`,
      maxTokens: 800,
    });

    const match = summary.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : { scan_type: "generic", findings: {}, overall_note: "Could not parse structured findings." };

    return {
      rows: [{ scan_type: "generic", parsed_findings: parsed, parse_status: "complete" }],
      summary: (parsed.overall_note as string) ?? "Generic PDF parsed.",
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
