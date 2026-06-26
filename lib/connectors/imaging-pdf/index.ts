import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { extractText } from "./extract-text";
import { generateText, aiEnabled } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";

export const imagingPdf: ConnectorModule = {
  id: "imaging_pdf",
  label: "Imaging / Radiology PDF",
  accepts: ["application/pdf"],
  targetTable: "files",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rawText = await extractText(input.fileBuffer);
    let summary = "Imaging report stored.";
    if (aiEnabled && rawText.trim()) {
      summary = await generateText({
        system: "You are a clinical assistant. Summarize this radiology/imaging report in 2-3 sentences for a practitioner. Focus on key findings and impressions.",
        prompt: rawText.slice(0, 4000),
        maxTokens: 300,
      });
    }
    return {
      rows: [{ kind: "scan_pdf", mime: "application/pdf", filename: input.originalFileName, source: "imaging_pdf" }],
      summary,
      rawText,
    };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    const { data: practitioner } = await createAdminClient()
      .from("practitioners")
      .select("id")
      .limit(1)
      .maybeSingle();
    const row = rows[0] ?? {};
    const storageRef = `patients/${patientId}/imports/${importId}-imaging.pdf`;
    const { data, error } = await admin.from("files").insert({
      ...row,
      patient_id: patientId,
      import_id: importId,
      storage_ref: storageRef,
      uploaded_by: practitioner?.id ?? null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return [data.id];
  },
};
