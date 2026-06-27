import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import {
  ackAlert,
  snoozeAlert,
  resolveAlert,
  addAlertRule,
  toggleAlertRule,
} from "./actions";

// Alerting + triage is an always-on PLATFORM feature (no requireModule gate).

type Severity = "info" | "warn" | "urgent";

type AlertRow = {
  id: string;
  patient_id: string;
  metric: string;
  value: number | null;
  severity: Severity;
  message: string | null;
  status: string;
  snoozed_until: string | null;
  created_at: string;
};

type RuleRow = {
  id: string;
  name: string;
  metric: string;
  comparator: string;
  threshold: number;
  severity: Severity;
  enabled: boolean;
};

const SEVERITY_RANK: Record<Severity, number> = { urgent: 0, warn: 1, info: 2 };
const SEVERITY_COLOR: Record<Severity, string> = {
  urgent: "#b91c1c",
  warn: "#b45309",
  info: "#475569",
};

const COMPARATOR_SYMBOL: Record<string, string> = {
  gt: ">",
  lt: "<",
  gte: "≥",
  lte: "≤",
};

function nameFor(
  patientId: string,
  names: Map<string, string>,
): string {
  return names.get(patientId) ?? "Unknown patient";
}

export default async function TriagePage() {
  await requireStaff();
  const supabase = await createClient();

  // PHI read — alerts join patient identity; must be audited.
  await logAudit({ action: "view", resource: "alerts" });

  const nowIso = new Date().toISOString();

  // Open alerts, plus snoozed alerts whose snooze has elapsed.
  const { data: alertData } = await supabase
    .from("alerts")
    .select(
      "id, patient_id, metric, value, severity, message, status, snoozed_until, created_at",
    )
    .in("status", ["open", "snoozed"])
    .order("created_at", { ascending: false });

  const alerts = ((alertData ?? []) as unknown as AlertRow[])
    .filter(
      (a) =>
        a.status === "open" ||
        (a.status === "snoozed" && (a.snoozed_until == null || a.snoozed_until <= nowIso)),
    )
    .sort((a, b) => {
      const r = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (r !== 0) return r;
      return b.created_at.localeCompare(a.created_at);
    });

  // Resolve patient display names (RLS scopes to the practice). Done as a
  // separate query because alerts.patient_id has no FK PostgREST can embed on.
  const names = new Map<string, string>();
  const patientIds = Array.from(new Set(alerts.map((a) => a.patient_id)));
  if (patientIds.length > 0) {
    const { data: pts } = await supabase
      .from("patients")
      .select("id, first_name, last_name")
      .in("id", patientIds);
    for (const p of (pts ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
    }>) {
      const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
      names.set(p.id, full || "Unknown patient");
    }
  }

  const { data: ruleData } = await supabase
    .from("alert_rules")
    .select("id, name, metric, comparator, threshold, severity, enabled")
    .order("created_at", { ascending: true });
  const rules = (ruleData ?? []) as RuleRow[];

  return (
    <div style={{ maxWidth: 980 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
        Triage
      </h1>
      <p className="muted">Open alerts across your patients, most urgent first.</p>

      {/* Alert queue */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Alert queue {alerts.length > 0 ? `(${alerts.length})` : ""}
        </h2>
        {alerts.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing needs attention. All clear.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  borderLeft: `4px solid ${SEVERITY_COLOR[a.severity]}`,
                  padding: "10px 12px",
                  background: "var(--surface, #fafafa)",
                  borderRadius: 6,
                }}
              >
                <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{nameFor(a.patient_id, names)}</div>
                  <div style={{ fontSize: 14 }}>
                    {a.message ??
                      `${a.metric}${a.value != null ? ` ${a.value}` : ""}`}
                  </div>
                </div>
                <span
                  className="badge"
                  style={{
                    background: SEVERITY_COLOR[a.severity],
                    color: "#fff",
                    textTransform: "uppercase",
                    fontSize: 11,
                  }}
                >
                  {a.severity}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <form action={ackAlert}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn ghost" type="submit" style={btnSm}>
                      Ack
                    </button>
                  </form>
                  <form action={snoozeAlert}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn ghost" type="submit" style={btnSm}>
                      Snooze 24h
                    </button>
                  </form>
                  <form action={resolveAlert}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn" type="submit" style={btnSm}>
                      Resolve
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Manage rules */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Manage rules
        </h2>

        {rules.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No alert rules yet. Add one below.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                  <th style={th}>Name</th>
                  <th style={th}>Condition</th>
                  <th style={th}>Severity</th>
                  <th style={th}>Status</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>{r.name}</td>
                    <td style={td}>
                      {r.metric} {COMPARATOR_SYMBOL[r.comparator] ?? r.comparator}{" "}
                      {r.threshold}
                    </td>
                    <td style={td}>
                      <span className="badge">{r.severity}</span>
                    </td>
                    <td style={td}>
                      {r.enabled ? (
                        <span className="badge">enabled</span>
                      ) : (
                        <span className="muted">disabled</span>
                      )}
                    </td>
                    <td style={td}>
                      <form action={toggleAlertRule}>
                        <input type="hidden" name="id" value={r.id} />
                        <input
                          type="hidden"
                          name="enabled"
                          value={String(r.enabled)}
                        />
                        <button className="btn ghost" type="submit" style={btnSm}>
                          {r.enabled ? "Disable" : "Enable"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add rule */}
        <form
          action={addAlertRule}
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "flex-end",
            marginTop: 16,
          }}
        >
          <label style={field}>
            <span className="muted" style={lbl}>
              Name
            </span>
            <input name="name" required placeholder="Elevated resting HR" style={inp} />
          </label>
          <label style={field}>
            <span className="muted" style={lbl}>
              Metric
            </span>
            <input name="metric" required placeholder="resting_hr" style={inp} />
          </label>
          <label style={field}>
            <span className="muted" style={lbl}>
              Comparator
            </span>
            <select name="comparator" defaultValue="gt" style={inp}>
              <option value="gt">&gt;</option>
              <option value="gte">≥</option>
              <option value="lt">&lt;</option>
              <option value="lte">≤</option>
            </select>
          </label>
          <label style={field}>
            <span className="muted" style={lbl}>
              Threshold
            </span>
            <input
              name="threshold"
              type="number"
              step="any"
              required
              placeholder="90"
              style={{ ...inp, width: 90 }}
            />
          </label>
          <label style={field}>
            <span className="muted" style={lbl}>
              Severity
            </span>
            <select name="severity" defaultValue="warn" style={inp}>
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="urgent">urgent</option>
            </select>
          </label>
          <button className="btn" type="submit">
            Add rule
          </button>
        </form>
      </section>
    </div>
  );
}

const th = { padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap" } as const;
const td = { padding: "6px 10px", whiteSpace: "nowrap" } as const;
const btnSm = { padding: "4px 12px", fontSize: 14 } as const;
const field = { display: "flex", flexDirection: "column", gap: 4 } as const;
const lbl = { fontSize: 12 } as const;
const inp = { padding: "6px 8px", fontSize: 14 } as const;
