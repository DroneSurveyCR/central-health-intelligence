import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import {
  computeCurrentPhase,
  groupItemsByPhaseAndLevel,
  planProgressPct,
  levelLabel,
  type Plan,
  type PlanPhase,
  type PlanItem,
} from "@/lib/plan/helpers";
import PlanEditor from "./PlanEditor";

export default async function StaffPlanPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, first_name, last_name, status_cached")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient)
    return <p className="muted">Client not found, or you don&apos;t have access.</p>;

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({ action: "view", resource: "plan", resourceId: patientId, patientId });

  // Prefer an active plan; otherwise the most recent one.
  const { data: plans } = await supabase
    .from("plans")
    .select("id, patient_id, practitioner_id, title, start_date, end_date, status")
    .eq("patient_id", patientId)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  const plan =
    (plans?.find((p) => p.status === "active") ?? plans?.[0] ?? null) as Plan | null;

  if (!plan) {
    return (
      <div style={{ maxWidth: 760 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
          {patient.first_name} {patient.last_name}
        </h1>
        <p className="muted">90-Day Plan</p>
        <div className="card" style={{ marginTop: 18 }}>
          <p style={{ margin: 0 }}>
            No plan yet. Add the first item to start a 90-Day Reset for this patient.
          </p>
          <PlanEditor patientId={patientId} phases={[]} />
        </div>
      </div>
    );
  }

  const [{ data: phaseRows }, { data: itemRows }] = await Promise.all([
    supabase
      .from("plan_phases")
      .select("id, plan_id, phase_number, name, start_offset_days, end_offset_days")
      .eq("plan_id", plan.id)
      .order("phase_number"),
    supabase
      .from("plan_items")
      .select("id, plan_id, phase_id, level, name, detail, dose")
      .eq("plan_id", plan.id),
  ]);

  const phases = (phaseRows ?? []) as PlanPhase[];
  const items = (itemRows ?? []) as PlanItem[];

  const today = new Date();
  const pct = planProgressPct(plan, today, phases);
  const currentPhase = computeCurrentPhase(plan, phases, today);
  const grouped = groupItemsByPhaseAndLevel(phases, items);

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          {patient.first_name} {patient.last_name}
        </h1>
        <StatusBadge status={plan.status} />
      </div>
      <p className="muted" style={{ marginTop: 4 }}>
        {plan.title ?? "90-Day Plan"} · {fmtRange(plan.start_date, plan.end_date)}
      </p>

      {/* Progress bar */}
      <div style={{ marginTop: 16, maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
          <span className="muted">Progress</span>
          <b>{pct}%</b>
        </div>
        <ProgressBar pct={pct} />
      </div>

      {/* Phase timeline */}
      {phases.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <h2 className="serif" style={{ fontSize: 19, margin: "0 0 10px" }}>Timeline</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {phases.map((ph) => {
              const isCurrent = currentPhase?.id === ph.id;
              return (
                <div
                  key={ph.id}
                  style={{
                    flex: "1 1 160px",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${isCurrent ? "var(--berry)" : "var(--line)"}`,
                    background: isCurrent ? "#e2f1e7" : "var(--card)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--berry)" }}>
                    Phase {ph.phase_number}
                    {isCurrent ? " · Now" : ""}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{ph.name ?? `Phase ${ph.phase_number}`}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {fmtPhaseWindow(ph)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items by phase + level */}
      <div style={{ marginTop: 26 }}>
        <h2 className="serif" style={{ fontSize: 19, margin: "0 0 10px" }}>Plan items</h2>
        {items.length === 0 && (
          <p className="muted">No items yet. Add the first one below.</p>
        )}
        {grouped.phases.map(
          (gp) =>
            gp.itemCount > 0 && (
              <div key={gp.phase.id} className="card" style={{ marginTop: 14 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>
                  {gp.phase.name ?? `Phase ${gp.phase.phase_number}`}
                </h3>
                {gp.levels.map((gl) => (
                  <LevelBlock key={gl.level} label={levelLabel(gl.level)} items={gl.items} />
                ))}
              </div>
            ),
        )}
        {grouped.unassigned.length > 0 && (
          <div className="card" style={{ marginTop: 14 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Unassigned</h3>
            {grouped.unassigned.map((gl) => (
              <LevelBlock key={gl.level} label={levelLabel(gl.level)} items={gl.items} />
            ))}
          </div>
        )}
      </div>

      <PlanEditor
        patientId={patientId}
        phases={phases.map((p) => ({
          id: p.id,
          label: p.name ? `Phase ${p.phase_number} · ${p.name}` : `Phase ${p.phase_number}`,
        }))}
      />
    </div>
  );
}

function LevelBlock({ label, items }: { label: string; items: PlanItem[] }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--berry)", fontWeight: 700 }}>
        {label}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0" }}>
        {items.map((it) => (
          <li key={it.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontWeight: 600 }}>{it.name}</span>
            {it.dose && <span className="muted"> · {it.dose}</span>}
            {it.detail && <div className="muted" style={{ fontSize: 13 }}>{it.detail}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 12, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: "var(--berry)",
          borderRadius: 999,
          transition: "width .3s ease",
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: Plan["status"] }) {
  const map: Record<Plan["status"], { bg: string; color: string }> = {
    draft: { bg: "var(--line)", color: "var(--ink)" },
    active: { bg: "#e2f1e7", color: "#46522f" },
    completed: { bg: "var(--berry)", color: "#fff" },
  };
  const s = map[status];
  return (
    <span
      className="badge"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

function fmtRange(start: string | null, end: string | null) {
  if (!start && !end) return "Dates not set";
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}
function fmtPhaseWindow(ph: PlanPhase) {
  const s = ph.start_offset_days ?? 0;
  const e = ph.end_offset_days;
  return e != null ? `Day ${s + 1}–${e}` : `From day ${s + 1}`;
}
