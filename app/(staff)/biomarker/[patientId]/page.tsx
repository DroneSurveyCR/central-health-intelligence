import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import {
  markerStatus,
  statusColor,
  type Marker,
} from "@/lib/biomarker/ranges";
import PanelEntry from "./PanelEntry";
import DeletePanelButton from "./DeletePanelButton";

type Panel = {
  id: string;
  patient_id: string;
  panel_name: string;
  drawn_at: string;
  lab_name: string | null;
  source_type: string | null;
  markers: Marker[] | null;
  biological_age: number | null;
  chronological_age: number | null;
  notes: string | null;
  created_at: string;
};

function refRange(m: Marker): string {
  const lo = typeof m.ref_low === "number" ? m.ref_low : null;
  const hi = typeof m.ref_high === "number" ? m.ref_high : null;
  if (lo == null && hi == null) return "—";
  return `${lo ?? "–"} – ${hi ?? "–"}`;
}

export default async function StaffBiomarkerPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  await requireModule("labs");
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
        Patient not found, or you don&apos;t have access.
      </p>
    );
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({ action: "view", resource: "biomarker_panels", patientId });

  const { data } = await supabase
    .from("biomarker_panels")
    .select(
      "id, patient_id, panel_name, drawn_at, lab_name, source_type, markers, biological_age, chronological_age, notes, created_at",
    )
    .eq("patient_id", patientId)
    .order("drawn_at", { ascending: false });

  const panels = (data ?? []) as Panel[];

  return (
    <div style={{ maxWidth: 760 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          {patient.first_name} {patient.last_name}
        </h1>
        <Link
          className="btn ghost"
          href={`/patients/${patientId}`}
          style={{ textDecoration: "none", padding: "4px 12px", fontSize: 14 }}
        >
          Back to record
        </Link>
      </div>
      <p className="muted">Biomarker panels</p>

      <PanelEntry patientId={patientId} />

      {panels.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p style={{ margin: 0 }}>No biomarker panels recorded yet.</p>
        </div>
      ) : (
        panels.map((panel) => {
          const markers = Array.isArray(panel.markers) ? panel.markers : [];
          return (
            <section key={panel.id} className="card" style={{ marginTop: 18 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    className="serif"
                    style={{ fontSize: 19, margin: "0 0 4px" }}
                  >
                    {panel.panel_name}
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    Drawn {panel.drawn_at}
                    {panel.lab_name ? ` · ${panel.lab_name}` : ""}
                    {panel.source_type ? ` · ${panel.source_type}` : ""}
                  </p>
                </div>
                <DeletePanelButton id={panel.id} />
              </div>

              {(panel.biological_age != null ||
                panel.chronological_age != null) && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 10,
                  }}
                >
                  {panel.biological_age != null && (
                    <span className="badge">
                      Biological age {panel.biological_age}
                    </span>
                  )}
                  {panel.chronological_age != null && (
                    <span className="badge">
                      Chronological age {panel.chronological_age}
                    </span>
                  )}
                </div>
              )}

              {markers.length === 0 ? (
                <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
                  No markers in this panel.
                </p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: 14,
                    fontSize: 14,
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th style={thStyle}>Marker</th>
                      <th style={thStyle}>Value</th>
                      <th style={thStyle}>Ref range</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markers.map((m, i) => {
                      const status = markerStatus(m);
                      const color = statusColor(status);
                      return (
                        <tr
                          key={`${m.name}-${i}`}
                          style={{ borderTop: "1px solid var(--line)" }}
                        >
                          <td style={tdStyle}>{m.name}</td>
                          <td style={{ ...tdStyle, color, fontWeight: 600 }}>
                            {m.value}
                            {m.unit ? ` ${m.unit}` : ""}
                          </td>
                          <td style={{ ...tdStyle, color: "var(--muted)" }}>
                            {refRange(m)}
                            {m.unit ? ` ${m.unit}` : ""}
                          </td>
                          <td style={{ ...tdStyle, color, fontWeight: 600 }}>
                            {status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {panel.notes && (
                <p style={{ marginTop: 12, fontSize: 14 }}>{panel.notes}</p>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

const thStyle = {
  padding: "6px 8px",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "var(--muted)",
  fontWeight: 600,
} as const;
const tdStyle = {
  padding: "8px",
  verticalAlign: "top",
} as const;
