import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { parseNoterroExport } from "./parse-patients";

export const noterrocsv: ConnectorModule = {
  id: "noterro_csv",
  label: "Noterro Migration CSV",
  accepts: ["text/csv", "text/plain"],
  targetTable: "patients",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const { patients } = parseNoterroExport(input.fileBuffer);
    if (!patients.length) throw new Error("No patient rows found. Expected columns: noterro_id, first_name, last_name.");
    const visitCount = patients.reduce((n, p) => n + p._visits.length, 0);
    const noEmail = patients.filter((p) => !p.email).length;
    const noDob   = patients.filter((p) => !p.dob).length;
    const warnings: string[] = [];
    if (noEmail) warnings.push(`${noEmail} patient(s) have no email address.`);
    if (noDob)   warnings.push(`${noDob} patient(s) are missing date of birth.`);
    return {
      rows: patients as unknown as Record<string, unknown>[],
      summary: `${patients.length} patients, ${visitCount} visit notes.`,
      warnings,
    };
  },

  async confirm(rows, importId, _patientId, admin: AnySupabaseClient): Promise<string[]> {
    const ids: string[] = [];
    for (const row of rows) {
      const { _visits, ...patientData } = row as Record<string, unknown>;
      const email      = patientData.email as string | undefined;
      const noterroId  = patientData.noterro_id as string;

      // Deduplicate: try noterro_id first (most reliable), fall back to email.
      let existing: { id: string } | null = null;
      const { data: byNotId } = await admin.from("patients").select("id").eq("noterro_id", noterroId).maybeSingle();
      if (byNotId) {
        existing = byNotId;
      } else if (email) {
        const { data: byEmail } = await admin.from("patients").select("id").eq("email", email).maybeSingle();
        if (byEmail) existing = byEmail;
      }

      let pid: string;
      if (existing) {
        pid = existing.id;
        // Update with any new fields from the export.
        await admin.from("patients").update({ ...patientData, import_id: importId }).eq("id", pid);
      } else {
        const { data, error } = await admin.from("patients")
          .insert({ ...patientData, import_id: importId })
          .select("id").single();
        if (error) throw new Error(`Patient insert failed (${noterroId} ${email ?? "no-email"}): ${error.message}`);
        pid = data.id;
        ids.push(pid);
      }

      if (Array.isArray(_visits)) {
        for (const v of _visits as Record<string, unknown>[]) {
          const { error: visitErr } = await admin.from("visits").insert({ ...v, patient_id: pid, import_id: importId });
          if (visitErr) throw new Error(`Visit insert failed for ${noterroId}: ${visitErr.message}`);
        }
      }
    }
    return ids;
  },
};
