import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import {
  REPORTS,
  type ReportKey,
  isReportKey,
  runReport,
  normalizeMonth,
  monthLabel,
  money,
  statusLabel,
  methodLabel,
  PAYMENT_METHODS,
  AR_BUCKETS,
  csvFilename,
  type ArBucket,
} from "@/lib/reports/queries";

export const dynamic = "force-dynamic";

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid var(--line)",
  whiteSpace: "nowrap",
  fontWeight: 600,
};
const thR: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = {
  padding: "7px 10px",
  borderBottom: "1px solid var(--line)",
  whiteSpace: "nowrap",
};
const tdR: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const tf: React.CSSProperties = { ...tdR, fontWeight: 700, borderTop: "2px solid var(--line)" };
const tfL: React.CSSProperties = { ...td, fontWeight: 700, borderTop: "2px solid var(--line)" };

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, React.CSSProperties> = {
    paid: { background: "var(--berry, #14834e)", color: "#fff" },
    sent: { background: "var(--gold, #f4a63c)", color: "#3a2a00" },
    draft: {},
    void: { opacity: 0.6 },
  };
  return (
    <span className="badge" style={tone[status] ?? {}}>
      {statusLabel(status)}
    </span>
  );
}

export default async function ReportsHub({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; month?: string }>;
}) {
  await requireModule("reports");
  await requireStaff();

  const sp = await searchParams;
  const report: ReportKey =
    sp.report && isReportKey(sp.report) ? sp.report : "daily-transactions";
  const month = normalizeMonth(sp.month);

  const supabase = await createClient();
  const data = await runReport(supabase, report, month);

  // Financial report view — auditable access.
  await logAudit({ action: "view", resource: `report:${report}`, resourceId: null });

  const csvHref = `/api/reports/${report}?month=${encodeURIComponent(month)}`;
  const tabHref = (k: ReportKey) =>
    `/reports?report=${k}&month=${encodeURIComponent(month)}`;

  return (
    <div style={{ maxWidth: 980 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
        Reports
      </h1>
      <p className="muted" style={{ marginTop: 4 }}>
        Financial reports for your practice. Filter by month and export to CSV.
      </p>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 18,
          flexWrap: "wrap",
          borderBottom: "1px solid var(--line)",
          paddingBottom: 10,
        }}
      >
        {REPORTS.map((r) => {
          const active = r.key === report;
          return (
            <Link
              key={r.key}
              href={tabHref(r.key)}
              className={active ? "btn" : "btn ghost"}
              style={{ fontSize: 13, textDecoration: "none" }}
            >
              {r.title}
            </Link>
          );
        })}
      </div>

      {/* Controls: month selector (GET form) + CSV download */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <input type="hidden" name="report" value={report} />
          <label style={{ fontSize: 13 }}>
            <div className="muted">Month</div>
            <input
              type="month"
              name="month"
              defaultValue={month}
              style={{
                padding: "6px 10px",
                border: "1px solid var(--line)",
                borderRadius: 8,
                fontSize: 14,
                marginTop: 4,
              }}
            />
          </label>
          <button className="btn ghost" type="submit" style={{ fontSize: 14 }}>
            Apply
          </button>
          {report === "outstanding" && (
            <span className="muted" style={{ fontSize: 12, paddingBottom: 8 }}>
              Live snapshot — month filter not applied.
            </span>
          )}
        </form>

        <a className="btn" href={csvHref} style={{ fontSize: 13, textDecoration: "none" }}>
          Download CSV ({csvFilename(report, month)})
        </a>
      </div>

      <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
        {report === "outstanding"
          ? "Unpaid invoices as of today."
          : `Showing ${monthLabel(month)}.`}
      </p>

      <div className="card" style={{ marginTop: 8, overflowX: "auto" }}>
        {data.kind === "daily" && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={thR}>Count</th>
                {PAYMENT_METHODS.map((m) => (
                  <th key={m} style={thR}>
                    {methodLabel(m)}
                  </th>
                ))}
                <th style={thR}>Day total</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={3 + PAYMENT_METHODS.length} className="muted" style={td}>
                    No payments this month.
                  </td>
                </tr>
              ) : (
                data.rows.map((r) => (
                  <tr key={r.day}>
                    <td style={td}>{r.day}</td>
                    <td style={tdR}>{r.count}</td>
                    {PAYMENT_METHODS.map((m) => (
                      <td key={m} style={tdR}>
                        {r.byMethod[m] ? money(r.byMethod[m]) : "—"}
                      </td>
                    ))}
                    <td style={tdR}>{money(r.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td style={tfL}>Grand total</td>
                <td style={tf}>{data.totals.count}</td>
                {PAYMENT_METHODS.map((m) => (
                  <td key={m} style={tf}>
                    {money(data.totals.byMethod[m])}
                  </td>
                ))}
                <td style={tf}>{money(data.totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {data.kind === "invoices" && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={th}>Number</th>
                <th style={th}>Patient</th>
                <th style={th}>Status</th>
                <th style={thR}>Total</th>
                <th style={th}>Paid at</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted" style={td}>
                    No invoices issued this month.
                  </td>
                </tr>
              ) : (
                data.rows.map((r, i) => (
                  <tr key={`${r.number}-${i}`}>
                    <td style={td}>{r.number}</td>
                    <td style={td}>{r.patient}</td>
                    <td style={td}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={tdR}>
                      {money(r.total)}
                      {r.currency && r.currency !== "USD" ? ` ${r.currency}` : ""}
                    </td>
                    <td style={td}>{r.paidAt}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td style={tfL} colSpan={3}>
                  Total
                </td>
                <td style={tf}>{money(data.total)}</td>
                <td style={{ ...tf, borderTop: "2px solid var(--line)" }} />
              </tr>
            </tfoot>
          </table>
        )}

        {data.kind === "outstanding" && (
          <>
            {/* Aging bucket summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 10,
                marginBottom: 14,
              }}
            >
              {AR_BUCKETS.map((b: ArBucket) => (
                <div
                  key={b}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div className="muted" style={{ fontSize: 12 }}>
                    {b} days
                  </div>
                  <div className="serif" style={{ fontSize: 18 }}>
                    {money(data.buckets[b])}
                  </div>
                </div>
              ))}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={th}>Number</th>
                  <th style={th}>Patient</th>
                  <th style={th}>Status</th>
                  <th style={th}>Due on</th>
                  <th style={thR}>Days overdue</th>
                  <th style={th}>Bucket</th>
                  <th style={thR}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted" style={td}>
                      Nothing outstanding. All invoices are paid or void.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r, i) => (
                    <tr key={`${r.number}-${i}`}>
                      <td style={td}>{r.number}</td>
                      <td style={td}>{r.patient}</td>
                      <td style={td}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={td}>{r.dueOn}</td>
                      <td style={tdR}>{r.daysOverdue > 0 ? r.daysOverdue : "—"}</td>
                      <td style={td}>
                        <span className="badge">{r.bucket}</span>
                      </td>
                      <td style={tdR}>{money(r.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td style={tfL} colSpan={6}>
                    Total outstanding
                  </td>
                  <td style={tf}>{money(data.total)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
