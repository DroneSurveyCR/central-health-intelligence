import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { detectDevice } from "./detect-device";
import { parseInBody } from "./inbody";
import { parseTanita } from "./tanita";
import Papa from "papaparse";

function parseGeneric(buf: Buffer): Record<string, unknown>[] {
  const { data } = Papa.parse<Record<string, string>>(buf.toString("utf-8"), { header: true, skipEmptyLines: true });
  return data.map((row) => ({ device_model: "Unknown", raw_data: row, measured_on: row["date"] ?? row["Date"] ?? null }));
}

export const bodyCompositionCsv: ConnectorModule = {
  id: "body_composition_csv",
  label: "Body Composition CSV",
  accepts: ["text/csv", "text/plain"],
  targetTable: "body_composition",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const header = input.fileBuffer.slice(0, 200).toString("utf-8");
    const device = detectDevice(header);
    const rows =
      device === "inbody" ? parseInBody(input.fileBuffer) :
      device === "tanita" ? parseTanita(input.fileBuffer) :
      parseGeneric(input.fileBuffer);
    if (!rows.length) throw new Error("No rows found in CSV.");
    const warnings = rows.filter((r) => !r.measured_on).length ? ["Some rows are missing a measurement date — defaulting to today."] : [];
    return { rows, summary: `${rows.length} body composition reading(s) from ${device} device.`, warnings };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    const today = new Date().toISOString().slice(0, 10);
    const inserts = rows.map((r) => ({ ...r, patient_id: patientId, import_id: importId, measured_on: r.measured_on ?? today }));
    const { data, error } = await admin.from("body_composition").insert(inserts).select("id");
    if (error) throw new Error(error.message);
    return (data as { id: string }[]).map((r) => r.id);
  },
};
