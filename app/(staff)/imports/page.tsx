import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  pending_parse: "Queued", parsing: "Parsing…", pending_review: "Needs review",
  confirmed: "Confirmed", failed: "Failed", rejected: "Rejected",
};
const STATUS_COLOR: Record<string, string> = {
  pending_parse: "#888", parsing: "var(--berry)", pending_review: "#e06e2a",
  confirmed: "#2a9d5e", failed: "#c0392b", rejected: "#888",
};

export default async function ImportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff();
  const { status } = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from("health_data_imports")
    .select("id, connector_id, status, raw_file_name, file_size_bytes, created_at, patients(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data: jobs } = await q;

  const statuses = ["pending_review", "pending_parse", "parsing", "confirmed", "failed", "rejected"];

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Data Imports</h1>
        <Link className="btn" href="/imports/new" style={{ textDecoration: "none" }}>+ Import data</Link>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <Link href="/imports" className={`btn ghost${!status ? " active" : ""}`} style={{ fontSize: 13, textDecoration: "none" }}>All</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/imports?status=${s}`} className={`btn ghost${status === s ? " active" : ""}`} style={{ fontSize: 13, textDecoration: "none" }}>
            {STATUS_LABEL[s] ?? s}
          </Link>
        ))}
      </div>

      {!jobs?.length && (
        <p className="muted">No import jobs{status ? ` with status "${STATUS_LABEL[status] ?? status}"` : ""} yet.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {jobs?.map((j) => {
          const p = Array.isArray(j.patients) ? j.patients[0] : j.patients as { first_name?: string; last_name?: string } | null;
          return (
            <Link key={j.id} href={`/imports/${j.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card" style={{ padding: "14px 18px", display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{j.raw_file_name ?? "Unnamed file"}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                    {p ? `${p.first_name} ${p.last_name}` : "Unknown patient"} · {j.connector_id.replace(/_/g, " ")}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[j.status] ?? "#888" }}>
                    {STATUS_LABEL[j.status] ?? j.status}
                  </span>
                  <div className="muted" style={{ fontSize: 12 }}>{new Date(j.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
