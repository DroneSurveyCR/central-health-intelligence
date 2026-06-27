import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import WeightEntry from "./WeightEntry";

type BodyComposition = {
  id: string;
  measured_on: string;
  device_model: string | null;
  weight_kg: number | null;
  bmi: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
};

function fmt(v: number | null, suffix = ""): string {
  return v == null ? "—" : `${v}${suffix}`;
}

function delta(latest: number | null, first: number | null, suffix = ""): string {
  if (latest == null || first == null) return "—";
  const d = latest - first;
  const sign = d > 0 ? "+" : "";
  return `${sign}${Math.round(d * 100) / 100}${suffix}`;
}

export default async function StaffWeightPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  await requireModule("weight");
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
  await logAudit({
    action: "view",
    resource: "body_composition",
    patientId,
  });

  const { data } = await supabase
    .from("body_composition")
    .select(
      "id, measured_on, device_model, weight_kg, bmi, body_fat_pct, muscle_mass_kg",
    )
    .eq("patient_id", patientId)
    .order("measured_on", { ascending: false })
    .limit(180);

  const rows = (data ?? []) as BodyComposition[];
  const latest = rows[0] ?? null;
  const first = rows.length > 0 ? rows[rows.length - 1] : null;

  return (
    <div style={{ maxWidth: 900 }}>
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
      <p className="muted">Body composition &amp; weight</p>

      {/* Trend: latest vs first */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Trend
          {latest && first && latest.id !== first.id
            ? ` — ${first.measured_on} → ${latest.measured_on}`
            : ""}
        </h2>
        {latest == null ? (
          <p className="muted" style={{ margin: 0 }}>
            No body-composition measurements yet.
          </p>
        ) : (
          <div className="stat-grid">
            <div className="stat">
              <div className="label">Latest weight</div>
              <div className="value">{fmt(latest.weight_kg, " kg")}</div>
            </div>
            <div className="stat">
              <div className="label">Weight change</div>
              <div className="value">
                {delta(latest.weight_kg, first?.weight_kg ?? null, " kg")}
              </div>
            </div>
            <div className="stat">
              <div className="label">Body fat change</div>
              <div className="value">
                {delta(latest.body_fat_pct, first?.body_fat_pct ?? null, "%")}
              </div>
            </div>
            <div className="stat">
              <div className="label">Muscle change</div>
              <div className="value">
                {delta(
                  latest.muscle_mass_kg,
                  first?.muscle_mass_kg ?? null,
                  " kg",
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Manual entry */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Add a measurement
        </h2>
        <WeightEntry patientId={patientId} />
      </section>

      {/* History table */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          History
        </h2>
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No measurements yet.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                  <th style={th}>Date</th>
                  <th style={th}>Weight</th>
                  <th style={th}>Body fat</th>
                  <th style={th}>Muscle</th>
                  <th style={th}>BMI</th>
                  <th style={th}>Device</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>{r.measured_on}</td>
                    <td style={td}>{fmt(r.weight_kg, " kg")}</td>
                    <td style={td}>{fmt(r.body_fat_pct, "%")}</td>
                    <td style={td}>{fmt(r.muscle_mass_kg, " kg")}</td>
                    <td style={td}>{fmt(r.bmi)}</td>
                    <td style={td}>
                      {r.device_model ? (
                        <span className="badge">{r.device_model}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const th = { padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap" } as const;
const td = { padding: "6px 10px", whiteSpace: "nowrap" } as const;
