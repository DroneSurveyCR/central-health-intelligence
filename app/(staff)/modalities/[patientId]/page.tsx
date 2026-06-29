import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import RecommendPicker, { type PickModality } from "./RecommendPicker";
import CourseTracker from "./CourseTracker";
import OutcomeLogger from "./OutcomeLogger";

type Course = {
  id: string;
  recommendation_id: string;
  sessions_total: number;
  sessions_done: number;
  next_session_at: string | null;
  status: string;
};

type Outcome = {
  id: string;
  recommendation_id: string;
  marker: string;
  baseline: number | null;
  during: number | null;
  after: number | null;
  delta: number | null;
  direction: string | null;
  verdict: string;
  notes: string | null;
  created_at: string;
};

type Recommendation = {
  id: string;
  modality_id: string;
  rationale: string | null;
  target_markers: string[] | null;
  measurement_window_days: number | null;
  status: string;
  recommended_at: string;
  modalities: { name: string; category: string | null } | null;
};

const REC_STATUS_COLORS: Record<string, string> = {
  recommended: "var(--muted)",
  accepted: "var(--berry, #6b3f69)",
  completed: "var(--berry, #6b3f69)",
  declined: "var(--muted)",
};

const VERDICT_COLORS: Record<string, string> = {
  improved: "#1a7f37",
  no_change: "var(--muted)",
  worsened: "#b3261e",
  inconclusive: "#9a6700",
};

export default async function PatientModalitiesPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  await requireModule("marketplace");
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
  await logAudit({ action: "view", resource: "modalities", patientId });

  // Menu for the picker (global + practice modalities via RLS).
  const { data: modData } = await supabase
    .from("modalities")
    .select("id, name, category, target_markers")
    .order("name", { ascending: true });
  const modalities = (modData ?? []) as PickModality[];

  const { data: recData } = await supabase
    .from("modality_recommendations")
    .select(
      "id, modality_id, rationale, target_markers, measurement_window_days, status, recommended_at, modalities(name, category)",
    )
    .eq("patient_id", patientId)
    .order("recommended_at", { ascending: false });
  const recommendations = (recData ?? []) as unknown as Recommendation[];

  const { data: courseData } = await supabase
    .from("modality_courses")
    .select(
      "id, recommendation_id, sessions_total, sessions_done, next_session_at, status",
    )
    .eq("patient_id", patientId);
  const courses = (courseData ?? []) as Course[];

  const { data: outcomeData } = await supabase
    .from("modality_outcomes")
    .select(
      "id, recommendation_id, marker, baseline, during, after, delta, direction, verdict, notes, created_at",
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  const outcomes = (outcomeData ?? []) as Outcome[];

  const courseByRec = new Map<string, Course>();
  for (const c of courses) courseByRec.set(c.recommendation_id, c);

  const outcomesByRec = new Map<string, Outcome[]>();
  for (const o of outcomes) {
    if (!outcomesByRec.has(o.recommendation_id))
      outcomesByRec.set(o.recommendation_id, []);
    outcomesByRec.get(o.recommendation_id)!.push(o);
  }

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
        <Link
          className="btn ghost"
          href="/modalities"
          style={{ textDecoration: "none", padding: "4px 12px", fontSize: 14 }}
        >
          Clinic menu
        </Link>
      </div>
      <p className="muted">Modality recommendations &amp; personal outcomes</p>

      <RecommendPicker patientId={patientId} modalities={modalities} />

      <h2 className="serif" style={{ fontSize: 20, marginTop: 26 }}>
        What&apos;s working for you
      </h2>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Each entry below is this patient&apos;s own observational response — not a
        general efficacy claim.
      </p>

      {recommendations.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>No modality recommendations yet.</p>
        </div>
      ) : (
        recommendations.map((rec) => {
          const course = courseByRec.get(rec.id);
          const recOutcomes = outcomesByRec.get(rec.id) ?? [];
          const markers = rec.target_markers ?? [];
          return (
            <section key={rec.id} className="card" style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <h3 style={{ margin: 0, fontSize: 17, flex: 1 }}>
                  {rec.modalities?.name ?? "Modality"}
                </h3>
                <span
                  className="badge"
                  style={{ background: REC_STATUS_COLORS[rec.status] ?? "var(--muted)" }}
                >
                  {rec.status}
                </span>
              </div>

              <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                Recommended {rec.recommended_at.slice(0, 10)}
                {rec.measurement_window_days
                  ? ` · ${rec.measurement_window_days}-day window`
                  : ""}
                {markers.length ? ` · tracking ${markers.join(", ")}` : ""}
              </p>

              {rec.rationale && (
                <p style={{ fontSize: 14, margin: "6px 0 0" }}>{rec.rationale}</p>
              )}

              {course && (
                <CourseTracker
                  courseId={course.id}
                  sessionsDone={course.sessions_done}
                  sessionsTotal={course.sessions_total}
                  status={course.status}
                />
              )}

              {recOutcomes.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p
                    className="muted"
                    style={{ fontSize: 12, margin: "0 0 6px", fontWeight: 600 }}
                  >
                    PERSONAL RESPONSE (observational)
                  </p>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={thStyle}>Marker</th>
                        <th style={thStyle}>Baseline</th>
                        <th style={thStyle}>After</th>
                        <th style={thStyle}>Δ</th>
                        <th style={thStyle}>Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recOutcomes.map((o) => (
                        <tr key={o.id}>
                          <td style={tdStyle}>{o.marker}</td>
                          <td style={tdStyle}>{o.baseline ?? "—"}</td>
                          <td style={tdStyle}>{o.after ?? "—"}</td>
                          <td style={tdStyle}>
                            {o.delta == null
                              ? "—"
                              : `${o.delta > 0 ? "+" : ""}${o.delta}`}
                          </td>
                          <td style={tdStyle}>
                            <span
                              className="badge"
                              style={{
                                background:
                                  VERDICT_COLORS[o.verdict] ?? "var(--muted)",
                              }}
                            >
                              {o.verdict.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <OutcomeLogger
                patientId={patientId}
                recommendationId={rec.id}
                markers={markers}
              />
            </section>
          );
        })
      )}
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
