import Papa from "papaparse";

export interface PatientRow {
  noterro_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  dob?: string;
  sex?: string;
  address?: string;
  notes_internal?: string;
  _visits: VisitRow[];
}

export interface VisitRow {
  visit_date: string;
  note_type?: string;
  summary: string;
  modalities_json: Record<string, unknown>;
}

// v2 export format:
//   • Each block starts with a single-letter label: "S: ...", "O: ...", "A: ...", "P: ..."
//   • The full note is repeated once per section — starting at S, then O, then A, then P.
//   • Inter-block separator: "\n<LETTER>: " (newline + single uppercase letter + colon + space)
//   • Within the first (complete) block, sub-sections use full-word headers with no colon,
//     often running directly into content: "...issuesObjectiveWalking..." "...defPlaneat more..."
//   • Notes may start at any section (e.g. "O: ..." when there's no Subjective).
//   • Some notes have an "Addenda" section after Plan.
//   • Boilerplate to strip: "Infection Prevention..." and trailing "Randi Raymond".
function parseSoapSummary(raw: string): {
  summary: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
} {
  const text = raw.trim();
  if (!text) return { summary: "" };

  // Cut at the first inter-block separator: newline + single-letter SOAP label + colon + space.
  // This isolates the first (complete) repetition block.
  const firstBlock = text
    .split(/\n(?=[SOAP]: )/i)[0]
    .replace(/Infection Prevention[\s\S]*/i, "")
    .replace(/Randi Raymond\s*$/i, "")
    .trim();

  if (!firstBlock) return { summary: "" };

  // Normalise the opening abbreviated label to its full word so one regex handles everything.
  const normalized = firstBlock
    .replace(/^S:\s*/,  "Subjective: ")
    .replace(/^O:\s*/,  "Objective: ")
    .replace(/^A:\s*/,  "Assessment: ")
    .replace(/^P:\s*/,  "Plan: ");

  // Split on full-word section headers. They appear with or without a colon/space and
  // may run directly into content ("...IssuesObjectiveWalking...").
  const tokens = normalized.split(/(Subjective|Objective|Analysis|Assessment|Plan|Addenda):?\s*/gi);

  // tokens = ["", "Subjective", "<subjective content>", "Objective", "<obj content>", ...]
  const sections: Record<string, string> = {};
  for (let i = 1; i < tokens.length; i += 2) {
    const header  = (tokens[i]  ?? "").toLowerCase();
    const content = (tokens[i + 1] ?? "").trim();
    const key =
      header === "subjective"                           ? "subjective" :
      header === "objective"                            ? "objective"  :
      header === "analysis" || header === "assessment"  ? "assessment" :
      header === "plan"                                 ? "plan"       :
      header === "addenda"                              ? "addenda"    : null;
    if (key && content) sections[key] = content;
  }

  const s  = sections["subjective"];
  const o  = sections["objective"];
  const a  = sections["assessment"];
  const p  = sections["plan"];
  const ad = sections["addenda"];

  const summary = [
    s  ? `**S:** ${s}`         : "",
    o  ? `**O:** ${o}`         : "",
    a  ? `**A:** ${a}`         : "",
    p  ? `**P:** ${p}`         : "",
    ad ? `**Addenda:** ${ad}`  : "",
  ].filter(Boolean).join("\n\n") || firstBlock;

  return { summary, subjective: s, objective: o, assessment: a, plan: p };
}

export function parseNoterroExport(buf: Buffer): { patients: PatientRow[] } {
  // Strip UTF-8 BOM if present (Noterro sometimes attaches it, mangling the first column name).
  const csv = buf.toString("utf-8").replace(/^﻿/, "");

  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  // Group rows by noterro_id — multi-visit clients appear once per visit.
  const byId = new Map<string, PatientRow>();

  for (const row of data) {
    const id = row["noterro_id"]?.trim();
    if (!id) continue;

    const email    = row["email"]?.trim().toLowerCase() || undefined;
    const first    = row["first_name"]?.trim() || "";
    const last     = row["last_name"]?.trim()  || "";
    if (!first && !last && !email) continue;

    if (!byId.has(id)) {
      const gpNotes  = row["gp_notes"]?.trim();
      const emContact = row["emergency_contact"]?.trim();
      const notes = [
        gpNotes   ? `GP: ${gpNotes}`                  : "",
        emContact ? `Emergency contact: ${emContact}` : "",
      ].filter(Boolean).join("\n") || undefined;

      byId.set(id, {
        noterro_id:     id,
        first_name:     first,
        last_name:      last,
        email,
        phone:          row["phone"]?.trim()         || undefined,
        dob:            row["date_of_birth"]?.trim() || undefined,
        sex:            row["sex"]?.trim()            || undefined,
        address:        row["address"]?.trim()        || undefined,
        notes_internal: notes,
        _visits: [],
      });
    }

    const visitDate = row["visit_date"]?.trim();
    const rawSoap   = row["soap_summary"]?.trim();
    const noteType  = row["note_type"]?.trim();

    if (visitDate || rawSoap) {
      const { summary, subjective, objective, assessment, plan } = parseSoapSummary(rawSoap ?? "");
      byId.get(id)!._visits.push({
        visit_date: visitDate || new Date().toISOString().slice(0, 10),
        note_type:  noteType  || undefined,
        summary:    summary   || "(no content)",
        modalities_json: {
          source:      "noterro_export",
          note_type:   noteType   ?? null,
          noterro_id:  id,
          subjective:  subjective ?? null,
          objective:   objective  ?? null,
          assessment:  assessment ?? null,
          plan:        plan       ?? null,
        },
      });
    }
  }

  return { patients: [...byId.values()] };
}
