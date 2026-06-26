import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { REPORTS, runReport, type ReportKey } from "@/lib/reports/queries";

const KEYS = REPORTS.map((r) => r.key) as string[];

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const inp: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14,
};

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ report: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireStaff();
  const { report } = await params;
  if (!KEYS.includes(report)) notFound();

  const def = defaultRange();
  const { from = def.from, to = def.to } = await searchParams;
  const supabase = await createClient();
  const data = await runReport(supabase, report as ReportKey, from, to);

  const csvHref = `/api/reports/${report}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  return (
    <div style={{ maxWidth: 860 }}>
      <Link href="/reports" className="muted" style={{ fontSize: 13, textDecoration: "none" }}>← Reports</Link>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
        <h1 className="serif" style={{ fontSize: 26, margin: 0 }}>{data.title}</h1>
        <a className="btn ghost" href={csvHref} style={{ fontSize: 13 }}>Export CSV</a>
      </div>

      <form method="get" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
        <label style={{ fontSize: 13 }}>
          <div className="muted">From</div>
          <input type="date" name="from" defaultValue={from} style={{ ...inp, marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13 }}>
          <div className="muted">To</div>
          <input type="date" name="to" defaultValue={to} style={{ ...inp, marginTop: 4 }} />
        </label>
        <button className="btn ghost" type="submit" style={{ fontSize: 14 }}>Apply</button>
      </form>

      <div className="card" style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              {data.columns.map((c) => (
                <th key={c} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "2px solid var(--line)", whiteSpace: "nowrap" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr><td colSpan={data.columns.length} className="muted" style={{ padding: "12px 10px" }}>No rows in this range.</td></tr>
            ) : (
              data.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" }}>{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {data.total != null && (
            <tfoot>
              <tr>
                <td colSpan={data.columns.length - 1} style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Total</td>
                <td style={{ padding: "8px 10px", fontWeight: 600 }}>{data.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
