import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import ProtocolBuilder from "./ProtocolBuilder";
import InjectionLogger from "./InjectionLogger";
import PrescriptionPanel, {
  type DraftPrescription,
} from "./PrescriptionPanel";

type Administration = {
  id: string;
  administered_at: string;
  dose_mg: number;
  route: string | null;
  injection_site: string | null;
  side_effects: string[] | null;
  side_effect_severity: number | null;
  notes: string | null;
};

type Protocol = {
  id: string;
  compound: string;
  category: string | null;
  route: string | null;
  start_date: string;
  goal: string | null;
  current_week: number;
  current_dose_mg: number;
  pharmacy_name: string | null;
  status: string;
  peptide_administrations: Administration[] | null;
};

const STATUS_COLORS: Record<string, string> = {
  active: "var(--berry)",
  paused: "var(--muted)",
  completed: "var(--muted)",
  discontinued: "var(--muted)",
};

export default async function StaffPeptidePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  await requireModule("peptide");
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
  await logAudit({ action: "view", resource: "peptide", patientId });

  const { data: protocolData } = await supabase
    .from("peptide_protocols")
    .select(
      "id, compound, category, route, start_date, goal, current_week, current_dose_mg, pharmacy_name, status, peptide_administrations(id, administered_at, dose_mg, route, injection_site, side_effects, side_effect_severity, notes)",
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  const { data: rxData } = await supabase
    .from("prescriptions")
    .select(
      "id, medication, dose, sig, quantity, refills, pharmacy_name, status, signed_at",
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  const protocols = (protocolData ?? []) as Protocol[];
  const prescriptions = (rxData ?? []) as DraftPrescription[];

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
      <p className="muted">Peptide / GLP-1 protocols &amp; e-prescribing</p>

      <ProtocolBuilder patientId={patientId} />

      {protocols.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p style={{ margin: 0 }}>No protocols yet.</p>
        </div>
      ) : (
        protocols.map((proto) => {
          const admins = (proto.peptide_administrations ?? [])
            .slice()
            .sort((a, b) =>
              a.administered_at < b.administered_at ? 1 : -1,
            )
            .slice(0, 8);
          return (
            <section key={proto.id} className="card" style={{ marginTop: 18 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h2
                  className="serif"
                  style={{ fontSize: 20, margin: 0, flex: 1 }}
                >
                  {proto.compound}
                </h2>
                <span
                  className="badge"
                  style={{ background: STATUS_COLORS[proto.status] }}
                >
                  {proto.status}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
                Week {proto.current_week} · {proto.current_dose_mg} mg
                {proto.route ? ` · ${proto.route}` : ""}
                {proto.goal ? ` · ${proto.goal}` : ""}
              </p>

              <InjectionLogger
                protocolId={proto.id}
                patientId={patientId}
              />

              {admins.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Dose</th>
                        <th style={thStyle}>Site</th>
                        <th style={thStyle}>Side effects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((a) => (
                        <tr key={a.id}>
                          <td style={tdStyle}>
                            {a.administered_at.slice(0, 10)}
                          </td>
                          <td style={tdStyle}>{a.dose_mg} mg</td>
                          <td style={tdStyle}>{a.injection_site ?? "—"}</td>
                          <td style={tdStyle}>
                            {a.side_effects && a.side_effects.length
                              ? a.side_effects.join(", ")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })
      )}

      <PrescriptionPanel
        patientId={patientId}
        prescriptions={prescriptions}
      />
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  borderBottom: "1.5px solid var(--line)",
  padding: "6px 8px",
  color: "var(--muted)",
} as const;
const tdStyle = {
  borderBottom: "1px solid var(--line)",
  padding: "6px 8px",
} as const;
