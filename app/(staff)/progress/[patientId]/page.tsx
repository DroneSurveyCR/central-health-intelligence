import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { LineChart, BarChart } from "@/lib/charts/Charts";
import {
  feelingSeries,
  bpSeries,
  adherenceByDay,
  type ProgressLog,
  type PlanCompletion,
} from "@/lib/progress/aggregate";

const FEELING_DAYS = 30;
const ADHERENCE_DAYS = 14;

export default async function StaffProgressPage({
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
      <p className="muted">Client not found, or you don&apos;t have access.</p>
    );
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({
    action: "view",
    resource: "progress",
    resourceId: patientId,
    patientId,
  });

  const since30 = new Date();
  since30.setDate(since30.getDate() - FEELING_DAYS);
  const since14 = new Date();
  since14.setDate(since14.getDate() - ADHERENCE_DAYS);

  const [{ data: logs }, { data: completions }, { data: activePlan }] =
    await Promise.all([
      supabase
        .from("progress_logs")
        .select("kind, value_json, logged_at")
        .eq("patient_id", patientId)
        .gte("logged_at", since30.toISOString())
        .order("logged_at", { ascending: true }),
      supabase
        .from("plan_completions")
        .select("date, completed")
        .eq("patient_id", patientId)
        .gte("date", since14.toISOString().slice(0, 10)),
      supabase
        .from("plans")
        .select("id")
        .eq("patient_id", patientId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  let itemCount = 0;
  if (activePlan?.id) {
    const { count } = await supabase
      .from("plan_items")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", activePlan.id);
    itemCount = count ?? 0;
  }

  const feeling = feelingSeries((logs ?? []) as ProgressLog[]);
  const bp = bpSeries((logs ?? []) as ProgressLog[]);
  const adherence = adherenceByDay(
    (completions ?? []) as PlanCompletion[],
    itemCount,
    ADHERENCE_DAYS,
  );

  const hasAnything =
    feeling.length > 0 || bp.systolic.length > 0 || itemCount > 0;

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        {patient.first_name} {patient.last_name} · Progress
      </h1>
      <p className="muted">
        Logged trends over the last {FEELING_DAYS} days.
      </p>

      {!hasAnything ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p style={{ margin: 0 }}>
            No progress logs or active plan yet for this patient.
          </p>
        </div>
      ) : (
        <>
          <section className="card" style={{ marginTop: 20 }}>
            <h2 className="serif" style={{ fontSize: 18, margin: "0 0 2px" }}>
              How they&apos;ve been feeling
            </h2>
            <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
              Self-rated 1–10 over the last {FEELING_DAYS} days.
            </p>
            {feeling.length > 0 ? (
              <LineChart
                data={feeling}
                color="var(--berry, #14834e)"
                yLabel="Feeling (1–10)"
              />
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                No &ldquo;how I feel&rdquo; check-ins recorded.
              </p>
            )}
          </section>

          <section className="card" style={{ marginTop: 16 }}>
            <h2 className="serif" style={{ fontSize: 18, margin: "0 0 2px" }}>
              Blood pressure
            </h2>
            <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
              Systolic and diastolic readings over time.
            </p>
            {bp.systolic.length > 0 || bp.diastolic.length > 0 ? (
              <LineChart
                data={bp.systolic}
                color="var(--berry, #14834e)"
                yLabel="mmHg"
                series={[
                  {
                    data: bp.systolic,
                    color: "var(--berry, #14834e)",
                    name: "Systolic",
                  },
                  {
                    data: bp.diastolic,
                    color: "var(--gold, #f4a63c)",
                    name: "Diastolic",
                  },
                ]}
              />
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                No vitals recorded.
              </p>
            )}
          </section>

          <section className="card" style={{ marginTop: 16 }}>
            <h2 className="serif" style={{ fontSize: 18, margin: "0 0 2px" }}>
              Plan adherence
            </h2>
            <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
              Share of the daily plan completed, last {ADHERENCE_DAYS} days.
            </p>
            {itemCount > 0 ? (
              <BarChart data={adherence} color="var(--gold, #f4a63c)" max={100} />
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                No active plan to measure adherence against.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
