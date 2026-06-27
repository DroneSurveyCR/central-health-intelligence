import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Practice = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  vertical: string | null;
  region: string;
  modules: string[] | null;
  created_at: string;
};

function tally(rows: { practice_id: string }[] | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows ?? []) m.set(r.practice_id, (m.get(r.practice_id) ?? 0) + 1);
  return m;
}

export default async function SuperAdminPage() {
  const user = await requireSuperAdmin();

  // Service-role client: bypasses RLS to see every tenant. Only reachable by the gate above.
  const admin = createAdminClient();
  const [{ data: practices }, { data: pts }, { data: pracs }] = await Promise.all([
    admin.from("practices").select("id, slug, name, plan, vertical, region, modules, created_at").order("created_at", { ascending: true }),
    admin.from("patients").select("practice_id"),
    admin.from("practitioners").select("practice_id"),
  ]);

  const patientCount = tally(pts as { practice_id: string }[] | null);
  const staffCount = tally(pracs as { practice_id: string }[] | null);
  const list = (practices ?? []) as Practice[];
  const totalPatients = (pts ?? []).length;

  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--line)", whiteSpace: "nowrap", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)" };
  const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--line)", fontSize: 14, whiteSpace: "nowrap" };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Platform · All Practices</h1>
        <span className="muted" style={{ fontSize: 13 }}>{user.email}</span>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        {[
          { label: "Practices", value: list.length },
          { label: "Total patients", value: totalPatients },
          { label: "Total staff", value: (pracs ?? []).length },
        ].map((s) => (
          <div key={s.label} className="card" style={{ minWidth: 130 }}>
            <div className="serif" style={{ fontSize: 26 }}>{s.value}</div>
            <div className="muted" style={{ fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18, overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Practice</th>
              <th style={th}>Plan</th>
              <th style={th}>Vertical</th>
              <th style={th}>Region</th>
              <th style={th}>Modules</th>
              <th style={th}>Patients</th>
              <th style={th}>Staff</th>
              <th style={th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td style={td} colSpan={8}><span className="muted">No practices yet.</span></td></tr>
            ) : list.map((p) => (
              <tr key={p.id}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.slug}</div>
                </td>
                <td style={td}><span className="badge">{p.plan}</span></td>
                <td style={td}>{p.vertical ?? "—"}</td>
                <td style={td}>{p.region}</td>
                <td style={td} title={(p.modules ?? []).join(", ")}>{(p.modules ?? []).length}</td>
                <td style={td}>{patientCount.get(p.id) ?? 0}</td>
                <td style={td}>{staffCount.get(p.id) ?? 0}</td>
                <td style={td} className="muted">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        Cross-tenant view (RLS-bypassed, super-admin only). Per-tenant detail, impersonation, plan/module
        management, and MRR are next. <Link href="/login" style={{ color: "var(--berry)" }}>Sign out</Link>
      </p>
    </div>
  );
}
