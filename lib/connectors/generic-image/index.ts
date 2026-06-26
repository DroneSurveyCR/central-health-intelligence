import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";

export const genericImage: ConnectorModule = {
  id: "generic_image",
  label: "Health Photo / Image",
  accepts: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  targetTable: "files",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    return {
      rows: [{ kind: "upload", mime: input.mimeType, filename: input.originalFileName, source: "generic_image" }],
      summary: `Image "${input.originalFileName}" stored in patient file.`,
    };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    // Look up the practitioner who uploaded this import so uploaded_by is accurate.
    const { data: importJob } = await admin
      .from("health_data_imports")
      .select("uploaded_by")
      .eq("id", importId)
      .maybeSingle();
    const { data: practitioner } = importJob?.uploaded_by
      ? await admin.from("practitioners").select("id").eq("auth_user_id", importJob.uploaded_by).maybeSingle()
      : { data: null };

    const row = rows[0] ?? {};
    const ext = (row.mime as string)?.split("/")[1] ?? "jpg";
    const storageRef = `patients/${patientId}/imports/${importId}.${ext}`;
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
