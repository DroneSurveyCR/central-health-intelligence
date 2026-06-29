import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/roles";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Escape PostgreSQL LIKE metacharacters so user input is treated as a literal string.
function escapeLike(s: string) {
  return s.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; resource?: string }>;
}) {
  await requireStaff();
  const supabase = await createClient();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  // Real audit_logs columns: actor_auth_user_id, action, resource, resource_id, patient_id, created_at
  let query = supabase
    .from("audit_logs")
    .select("id, actor_auth_user_id, action, resource, resource_id, patient_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (sp.action) query = query.eq("action", sp.action);
  if (sp.resource) query = query.ilike("resource", `%${escapeLike(sp.resource)}%`);

  const { data: logs, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  const filterLink = (extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (sp.action) params.set("action", sp.action);
    if (sp.resource) params.set("resource", sp.resource);
    if (extra) Object.entries(extra).forEach(([k, v]) => v ? params.set(k, v) : params.delete(k));
    const qs = params.toString();
    return `/audit${qs ? `?${qs}` : ""}`;
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Audit Log</h1>
        <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
          Immutable record of all actions in your practice. {count != null ? `${count.toLocaleString()} entries.` : ""}
        </p>
      </div>

      {/* Filters */}
      <form style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select
          name="action"
          defaultValue={sp.action ?? ""}
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }}
        >
          <option value="">All actions</option>
          {["view","create","update","delete","export","ai_synthesis"].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          name="resource"
          defaultValue={sp.resource ?? ""}
          placeholder="Filter by resource…"
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, minWidth: 180 }}
        />
        <button type="submit" className="btn primary" style={{ padding: "6px 16px", fontSize: 13 }}>Filter</button>
        {(sp.action || sp.resource) && (
          <Link href="/audit" className="btn ghost" style={{ padding: "6px 16px", fontSize: 13 }}>Clear</Link>
        )}
      </form>

      {/* Table */}
      <div style={{ overflowX: "auto", background: "var(--card)", borderRadius: 12, border: "1px solid var(--line)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
              {["Timestamp", "Actor ID", "Action", "Resource", "Resource ID", "Client"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((row, i) => (
              <tr key={row.id} style={{ borderBottom: i < (logs?.length ?? 0) - 1 ? "1px solid var(--line)" : "none" }}>
                <td style={{ padding: "9px 16px", whiteSpace: "nowrap", color: "var(--muted)", fontFamily: "monospace", fontSize: 12 }}>
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td style={{ padding: "9px 16px", fontFamily: "monospace", fontSize: 11, color: "var(--muted)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row.actor_auth_user_id ? row.actor_auth_user_id.slice(0, 8) + "…" : "—"}
                </td>
                <td style={{ padding: "9px 16px" }}>
                  <span style={{
                    background: row.action === "delete" ? "#fee2e2" : row.action === "create" ? "#dcfce7" : row.action === "export" ? "#ede9fe" : "#fef9c3",
                    color: row.action === "delete" ? "#991b1b" : row.action === "create" ? "#166534" : row.action === "export" ? "#5b21b6" : "#854d0e",
                    padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600
                  }}>{row.action}</span>
                </td>
                <td style={{ padding: "9px 16px", fontFamily: "monospace", fontSize: 12 }}>{row.resource ?? "—"}</td>
                <td style={{ padding: "9px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row.resource_id ?? "—"}
                </td>
                <td style={{ padding: "9px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--muted)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row.patient_id ? row.patient_id.slice(0, 8) + "…" : "—"}
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr><td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>No audit entries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
          {page > 1 && (
            <Link href={filterLink({ page: String(page - 1) })} className="btn ghost" style={{ padding: "6px 16px", fontSize: 13 }}>← Previous</Link>
          )}
          <span style={{ padding: "6px 12px", fontSize: 13, color: "var(--muted)" }}>Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={filterLink({ page: String(page + 1) })} className="btn ghost" style={{ padding: "6px 16px", fontSize: 13 }}>Next →</Link>
          )}
        </div>
      )}
    </div>
  );
}
