import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import ScreeningForm from "./ScreeningForm";
import SessionLogger from "./SessionLogger";

const SUBSTANCES = [
  "ketamine",
  "psilocybin",
  "mdma",
  "ibogaine",
  "ayahuasca",
  "5-meo-dmt",
];

type Screening = {
  id: string;
  substance: string;
  screening_date: string;
  screening_result: "cleared" | "conditional" | "contraindicated" | null;
};

type Session = {
  id: string;
  session_type: string;
  substance: string | null;
  dose_mg: number | null;
  session_date: string;
  patient_rating: number | null;
};

function resultColor(result: string | null): { bg: string; fg: string } {
  if (result === "contraindicated")
    return { bg: "var(--berry)", fg: "#fff" };
  if (result === "cleared") return { bg: "#1f7a4d", fg: "#fff" };
  return { bg: "var(--muted)", fg: "#fff" };
}

export default async function PsychedelicPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  await requireModule("psychedelic");
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
  await logAudit({ action: "view", resource: "psychedelic", patientId });

  const { data: screeningData } = await supabase
    .from("psychedelic_screenings")
    .select("id, substance, screening_date, screening_result")
    .eq("patient_id", patientId)
    .order("screening_date", { ascending: false });

  const { data: sessionData } = await supabase
    .from("psychedelic_sessions")
    .select("id, session_type, substance, dose_mg, session_date, patient_rating")
    .eq("patient_id", patientId)
    .order("session_date", { ascending: false });

  const screenings = (screeningData ?? []) as Screening[];
  const sessions = (sessionData ?? []) as Session[];

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
      <p className="muted">Plant Medicine / Psychedelic Therapy</p>

      <ScreeningForm patientId={patientId} substances={SUBSTANCES} />

      <SessionLogger patientId={patientId} />

      <section style={{ marginTop: 28 }}>
        <h2
          style={{
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "var(--berry)",
            margin: "0 0 10px",
          }}
        >
          Screenings
        </h2>
        {screenings.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No screenings recorded yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {screenings.map((s) => {
              const c = resultColor(s.screening_result);
              return (
                <div
                  key={s.id}
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <strong style={{ textTransform: "capitalize" }}>
                    {s.substance}
                  </strong>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {s.screening_date}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: c.bg,
                      color: c.fg,
                      marginLeft: "auto",
                    }}
                  >
                    {s.screening_result ?? "pending"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2
          style={{
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "var(--berry)",
            margin: "0 0 10px",
          }}
        >
          Sessions
        </h2>
        {sessions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No sessions logged yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <strong style={{ textTransform: "capitalize" }}>
                  {s.session_type}
                </strong>
                {s.substance && (
                  <span style={{ textTransform: "capitalize" }}>
                    {s.substance}
                  </span>
                )}
                {s.dose_mg != null && (
                  <span className="muted" style={{ fontSize: 14 }}>
                    {s.dose_mg} mg
                  </span>
                )}
                <span className="muted" style={{ fontSize: 14 }}>
                  {s.session_date}
                </span>
                {s.patient_rating != null && (
                  <span className="badge" style={{ marginLeft: "auto" }}>
                    rating {s.patient_rating}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
