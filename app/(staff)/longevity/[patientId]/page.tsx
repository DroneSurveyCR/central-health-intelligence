import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import ComputeBioAge from "./ComputeBioAge";

type Marker = {
  name: string;
  value: number;
  unit?: string | null;
};

type Panel = {
  id: string;
  drawn_at: string;
  lab_name: string | null;
  markers: Marker[] | null;
  biological_age: number | null;
  chronological_age: number | null;
};

type Score = {
  id: string;
  score_date: string;
  biological_age: number;
  chronological_age: number;
  delta: number | null;
  algorithm: string | null;
};

/** Whole-year age from an ISO date-of-birth string, or null if absent/invalid. */
function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export default async function StaffLongevityPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  await requireModule("longevity");
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name, dob")
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
  await logAudit({ action: "view", resource: "biological_age_scores", patientId });

  const chronoAge = ageFromDob(patient.dob ?? null);

  const { data: panelData } = await supabase
    .from("biomarker_panels")
    .select(
      "id, drawn_at, lab_name, markers, biological_age, chronological_age",
    )
    .eq("patient_id", patientId)
    .order("drawn_at", { ascending: false });

  const panels = (panelData ?? []) as Panel[];
  const latestPanel = panels[0] ?? null;
  const latestMarkers: Marker[] = Array.isArray(latestPanel?.markers)
    ? (latestPanel!.markers as Marker[])
    : [];

  const { data: scoreData } = await supabase
    .from("biological_age_scores")
    .select(
      "id, score_date, biological_age, chronological_age, delta, algorithm",
    )
    .eq("patient_id", patientId)
    .order("score_date", { ascending: false });

  const scores = (scoreData ?? []) as Score[];
  const latestScore = scores[0] ?? null;

  // Hero figures: prefer a recorded score, then fall back to the latest panel.
  const heroBioAge =
    latestScore?.biological_age ?? latestPanel?.biological_age ?? null;
  const heroChrono =
    latestScore?.chronological_age ??
    latestPanel?.chronological_age ??
    chronoAge;
  const heroDelta =
    heroBioAge != null && heroChrono != null
      ? Math.round((heroBioAge - heroChrono) * 10) / 10
      : null;
  const younger = heroDelta != null && heroDelta < 0;
  const heroColor =
    heroDelta == null
      ? "var(--muted)"
      : younger
        ? "#2f8f5b"
        : heroDelta > 0
          ? "var(--berry)"
          : "var(--muted)";

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
      <p className="muted">Longevity &amp; biological age</p>

      {/* Hero card */}
      <section className="card" style={{ marginTop: 8 }}>
        {heroBioAge == null ? (
          <p style={{ margin: 0 }}>
            No biological age recorded yet. Compute one from the latest panel
            below, or record a score manually.
          </p>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                gap: 28,
                flexWrap: "wrap",
                alignItems: "flex-end",
              }}
            >
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Biological age
                </div>
                <div
                  className="serif"
                  style={{ fontSize: 44, lineHeight: 1, color: heroColor }}
                >
                  {heroBioAge}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Chronological age
                </div>
                <div className="serif" style={{ fontSize: 44, lineHeight: 1 }}>
                  {heroChrono ?? "—"}
                </div>
              </div>
            </div>
            {heroDelta != null && (
              <p
                style={{
                  marginTop: 16,
                  marginBottom: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: heroColor,
                }}
              >
                {heroDelta === 0
                  ? "On par with chronological age"
                  : `${Math.abs(heroDelta)} years ${
                      younger ? "younger" : "older"
                    } biologically`}
              </p>
            )}
          </div>
        )}
      </section>

      <ComputeBioAge
        patientId={patientId}
        chronoAge={chronoAge}
        latestPanelMarkers={latestMarkers.map((m) => ({
          name: m.name,
          value: Number(m.value),
          // Thread the lab-reported unit so PhenoAge can convert to SI.
          unit: m.unit ?? null,
        }))}
      />

      {/* Biomarker grid from latest panel */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Latest panel markers
        </h2>
        {latestPanel ? (
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Drawn {latestPanel.drawn_at}
            {latestPanel.lab_name ? ` · ${latestPanel.lab_name}` : ""}
          </p>
        ) : null}
        {latestMarkers.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            No biomarker panel on file.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            {latestMarkers.map((m, i) => (
              <div
                key={`${m.name}-${i}`}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 11,
                  padding: 12,
                }}
              >
                <div className="muted" style={{ fontSize: 12 }}>
                  {m.name}
                </div>
                <div
                  className="serif"
                  style={{ fontSize: 20, marginTop: 4 }}
                >
                  {m.value}
                  {m.unit ? (
                    <span
                      className="muted"
                      style={{ fontSize: 13, marginLeft: 4 }}
                    >
                      {m.unit}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trend list */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Biological age over time
        </h2>
        {scores.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            No recorded scores yet.
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Bio age</th>
                <th style={thStyle}>Chrono</th>
                <th style={thStyle}>Delta</th>
                <th style={thStyle}>Method</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => {
                const d = s.delta ?? s.biological_age - s.chronological_age;
                const c =
                  d < 0 ? "#2f8f5b" : d > 0 ? "var(--berry)" : "var(--muted)";
                return (
                  <tr
                    key={s.id}
                    style={{ borderTop: "1px solid var(--line)" }}
                  >
                    <td style={tdStyle}>{s.score_date}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {s.biological_age}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--muted)" }}>
                      {s.chronological_age}
                    </td>
                    <td style={{ ...tdStyle, color: c, fontWeight: 600 }}>
                      {d > 0 ? "+" : ""}
                      {Math.round(d * 10) / 10}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--muted)" }}>
                      {s.algorithm ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
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
