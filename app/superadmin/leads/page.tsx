import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Lead = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  clinic: string | null;
  vertical: string | null;
  intent: string;
  options: string[] | null;
  message: string | null;
  source: string | null;
  ref: string | null;
};

export default async function SuperAdminLeadsPage() {
  await requireSuperAdmin();

  // Service-role read: the leads table has RLS on with no policies, so only this path can read it.
  const { data } = await createAdminClient()
    .from("leads")
    .select("id, created_at, name, email, phone, clinic, vertical, intent, options, message, source, ref")
    .order("created_at", { ascending: false })
    .limit(300);
  const leads = (data ?? []) as Lead[];

  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--line)", whiteSpace: "nowrap", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)" };
  const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--line)", fontSize: 14, verticalAlign: "top" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Leads</h1>
        <Link href="/superadmin" className="muted" style={{ fontSize: 13 }}>← All practices</Link>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
        {leads.length} captured from the marketing site (demo / pricing / get-started).
      </p>

      <div className="card" style={{ marginTop: 16, overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>When</th>
              <th style={th}>Name</th>
              <th style={th}>Contact</th>
              <th style={th}>Clinic</th>
              <th style={th}>Intent</th>
              <th style={th}>Vertical</th>
              <th style={th}>Ref</th>
              <th style={th}>Needs</th>
              <th style={th} aria-label="actions"></th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr><td style={td} colSpan={9}><span className="muted">No leads yet.</span></td></tr>
            ) : leads.map((l) => (
              <tr key={l.id}>
                <td style={{ ...td, whiteSpace: "nowrap" }} className="muted">{new Date(l.created_at).toLocaleString()}</td>
                <td style={td}><div style={{ fontWeight: 600 }}>{l.name}</div></td>
                <td style={td}>
                  <a href={`mailto:${l.email}`} style={{ color: "var(--berry)" }}>{l.email}</a>
                  {l.phone && <div className="muted" style={{ fontSize: 12.5 }}>{l.phone}</div>}
                </td>
                <td style={td}>{l.clinic ?? "—"}</td>
                <td style={td}><span className="badge">{l.intent}</span></td>
                <td style={td}>{l.vertical ?? "—"}</td>
                <td style={td}>{l.ref ? <span className="badge">{l.ref}</span> : "—"}</td>
                <td style={td}>
                  <span style={{ fontSize: 13 }}>{(l.options ?? []).join(", ") || "—"}</span>
                  {l.message && <div className="muted" style={{ fontSize: 12.5, marginTop: 3, maxWidth: 280 }}>{l.message}</div>}
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <Link
                    href={`/superadmin/new?name=${encodeURIComponent(l.name)}&email=${encodeURIComponent(l.email)}&clinic=${encodeURIComponent(l.clinic ?? "")}&vertical=${encodeURIComponent(l.vertical ?? "")}`}
                    className="btn ghost"
                    style={{ fontSize: 12, padding: "6px 10px" }}
                  >
                    Create instance →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
