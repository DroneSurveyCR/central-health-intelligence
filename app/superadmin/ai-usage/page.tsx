import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type LogRow = { practice_id: string; action: string; resource: string; created_at: string };
type Practice = { id: string; name: string; slug: string };
type Counts = { today: number; d7: number; d30: number };

function blankCounts(): Counts {
  return { today: 0, d7: 0, d30: 0 };
}

function bump(c: Counts, ageMs: number) {
  const DAY = 86400000;
  if (ageMs < DAY) c.today++;
  if (ageMs < 7 * DAY) c.d7++;
  if (ageMs < 30 * DAY) c.d30++;
}

/**
 * Cross-tenant AI usage — doctor-side vs patient-side, per practice.
 *
 * Doctor AI = audit_logs rows with action='ai_synthesis' (SOAP notes, session
 * synthesis, message-reply drafts, narrative — 4 of the 5 doctor producers;
 * the plan-drafting route currently logs action='create', resource='plans',
 * which is NOT separately tagged from manual plan edits in /api/plan, so
 * plan-drafting AI calls aren't counted here yet — a known follow-up).
 *
 * Patient AI = audit_logs rows with action='view', resource='assistant'
 * (the one call site: app/api/assistant/route.ts) — unambiguous.
 */
export default async function AiUsagePage() {
  await requireSuperAdmin();

  const admin = createAdminClient();
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();

  const [{ data: practices }, { data: logs }] = await Promise.all([
    admin.from("practices").select("id, name, slug").order("name", { ascending: true }),
    admin
      .from("audit_logs")
      .select("practice_id, action, resource, created_at")
      .gte("created_at", since30d)
      .or("action.eq.ai_synthesis,and(action.eq.view,resource.eq.assistant)"),
  ]);

  const practiceById = new Map<string, Practice>((practices as Practice[] | null ?? []).map((p) => [p.id, p]));
  const doctorByPractice = new Map<string, Counts>();
  const patientByPractice = new Map<string, Counts>();
  const now = Date.now();

  for (const row of (logs as LogRow[] | null) ?? []) {
    const ageMs = now - new Date(row.created_at).getTime();
    const isPatient = row.action === "view" && row.resource === "assistant";
    const isDoctor = row.action === "ai_synthesis";
    if (!isPatient && !isDoctor) continue;
    const map = isPatient ? patientByPractice : doctorByPractice;
    const c = map.get(row.practice_id) ?? blankCounts();
    bump(c, ageMs);
    map.set(row.practice_id, c);
  }

  const practiceIds = new Set<string>([...doctorByPractice.keys(), ...patientByPractice.keys()]);
  const rows = [...practiceIds]
    .map((id) => ({
      practice: practiceById.get(id) ?? { id, name: "(unknown)", slug: id },
      doctor: doctorByPractice.get(id) ?? blankCounts(),
      patient: patientByPractice.get(id) ?? blankCounts(),
    }))
    .sort((a, b) => b.doctor.d30 + b.patient.d30 - (a.doctor.d30 + a.patient.d30));

  const totalDoctor = rows.reduce((s, r) => s + r.doctor.d30, 0);
  const totalPatient = rows.reduce((s, r) => s + r.patient.d30, 0);

  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--line)", whiteSpace: "nowrap", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)" };
  const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--line)", fontSize: 14, whiteSpace: "nowrap" };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px" }}>
      <Link href="/superadmin" className="muted" style={{ fontSize: 13 }}>← All practices</Link>
      <h1 className="serif" style={{ fontSize: 26, margin: "10px 0 4px" }}>AI usage</h1>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Doctor-side (SOAP / synthesis / message-drafts / narrative) and patient-side (assistant chat) AI calls,
        per practice, last 30 days.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <div className="card" style={{ minWidth: 140 }}>
          <div className="serif" style={{ fontSize: 26 }}>{totalDoctor}</div>
          <div className="muted" style={{ fontSize: 12 }}>Doctor AI calls (30d)</div>
        </div>
        <div className="card" style={{ minWidth: 140 }}>
          <div className="serif" style={{ fontSize: 26 }}>{totalPatient}</div>
          <div className="muted" style={{ fontSize: 12 }}>Patient AI calls (30d)</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18, overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Practice</th>
              <th style={th} colSpan={3}>Doctor AI</th>
              <th style={th} colSpan={3}>Patient AI</th>
            </tr>
            <tr>
              <th style={th}></th>
              <th style={th}>Today</th><th style={th}>7d</th><th style={th}>30d</th>
              <th style={th}>Today</th><th style={th}>7d</th><th style={th}>30d</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td style={td} colSpan={7}><span className="muted">No AI activity in the last 30 days.</span></td></tr>
            ) : rows.map((r) => (
              <tr key={r.practice.id}>
                <td style={td}>
                  <Link href={`/superadmin/${r.practice.id}`} style={{ color: "inherit" }}>
                    <div style={{ fontWeight: 600 }}>{r.practice.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{r.practice.slug}</div>
                  </Link>
                </td>
                <td style={td}>{r.doctor.today}</td>
                <td style={td}>{r.doctor.d7}</td>
                <td style={td}>{r.doctor.d30}</td>
                <td style={td}>{r.patient.today}</td>
                <td style={td}>{r.patient.d7}</td>
                <td style={td}>{r.patient.d30}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        Plan-drafting AI calls (<code>/api/ai/plan</code>) aren&apos;t counted yet — that route logs the same
        audit action as a manual plan edit, so it can&apos;t be told apart from non-AI activity without a small
        follow-up to the plan producer&apos;s audit tag.
      </p>
    </div>
  );
}
