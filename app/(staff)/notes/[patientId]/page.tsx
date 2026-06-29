import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import NoteEditor from "./NoteEditor";
import DraftWithAiButton from "@/lib/ai/DraftWithAiButton";
import { aiEnabled } from "@/lib/ai";

const TYPE_LABELS: Record<string, string> = {
  consult: "Consult",
  follow_up: "Follow-up",
  scan_review: "Scan review",
  other: "Other",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function NotesPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient) {
    return (
      <p className="muted">
        Client not found, or you don&apos;t have access.
      </p>
    );
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({
    action: "view",
    resource: "visits",
    resourceId: patientId,
    patientId,
  });

  const { data: visits } = await supabase
    .from("visits")
    .select("id, visit_date, summary, modalities_json, created_at")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("visit_date", { ascending: false });

  const rows = visits ?? [];

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
        {patient.first_name} {patient.last_name}
      </h1>
      <p className="muted">Visit notes</p>

      <div style={{ margin: "10px 0 4px" }}>
        <DraftWithAiButton
          endpoint="/api/ai/soap"
          body={{ patientId }}
          label="Draft SOAP with AI"
          aiEnabled={aiEnabled}
        />
      </div>

      <NoteEditor patientId={patientId} />

      <h2 className="serif" style={{ fontSize: 19, marginTop: 28 }}>
        Timeline
      </h2>

      {rows.length === 0 ? (
        <p className="muted">No visit notes yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((v) => {
            const mods = (v.modalities_json ?? {}) as Record<string, unknown>;
            const noteType =
              typeof mods.note_type === "string" ? mods.note_type : null;
            const typeLabel = noteType
              ? TYPE_LABELS[noteType] ?? noteType
              : null;
            return (
              <div key={v.id} className="card">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {formatDate(v.visit_date ?? v.created_at)}
                  </span>
                  {typeLabel && <span className="badge">{typeLabel}</span>}
                </div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 15,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {v.summary || <span className="muted">No text.</span>}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
