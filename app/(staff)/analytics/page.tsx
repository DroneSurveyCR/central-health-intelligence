import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { buildMetrics } from "@/lib/analytics/metrics";
import { AreaChart, BarChart, DonutChart, Sparkline } from "@/lib/charts/Charts";

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Up/down delta chip vs the prior period. */
function Delta({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span className={`delta ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}% vs prior 30d
    </span>
  );
}

function Stat({
  label,
  value,
  delta,
  spark,
  sparkColor,
  sub,
}: {
  label: string;
  value: string;
  delta?: number | null;
  spark?: number[];
  sparkColor?: string;
  sub?: string;
}) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {delta !== undefined && <Delta pct={delta} />}
      {sub && (
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          {sub}
        </div>
      )}
      {spark && spark.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <Sparkline data={spark} color={sparkColor ?? "var(--berry, #14834e)"} width={120} height={28} />
        </div>
      )}
    </div>
  );
}

export default async function AnalyticsPage() {
  await requireStaff(["doctor", "admin"]);
  const supabase = await createClient();

  const m = await buildMetrics(supabase);

  await logAudit({ action: "view", resource: "analytics" });

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          Analytics
        </h1>
        <p className="muted" style={{ marginTop: 4 }}>
          The practice cockpit — patients, schedule, plans and revenue at a glance.
        </p>
      </div>

      {/* ---------------- Overview: metric tiles ---------------- */}
      <p className="eyebrow">Overview</p>
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <Stat label="Clients" value={String(m.totalPatients)} sub="Active records" />
        <Stat
          label="New patients (30d)"
          value={String(m.newPatients30d)}
          delta={m.newPatientsDeltaPct}
          spark={m.newPatientsSpark}
        />
        <Stat
          label="Upcoming appts"
          value={String(m.upcomingAppts)}
          sub={`${m.apptsThisWeek} in the next 7 days`}
        />
        <Stat
          label="Active plans"
          value={String(m.activePlans)}
          sub={`${m.activePlanRate}% of patients`}
        />
        <Stat
          label="Revenue (30d)"
          value={money(m.revenue30d)}
          delta={m.revenueDeltaPct}
          spark={m.revenueSpark}
          sparkColor="var(--gold, #f4a63c)"
        />
        <Stat
          label="Orders"
          value={String(m.ordersCount)}
          sub={`${money(m.ordersRevenue)} ordered`}
        />
      </div>

      {/* ---------------- Trends: chart grid ---------------- */}
      <p className="eyebrow">Trends</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18,
          marginBottom: 18,
        }}
      >
        <div className="chart-card">
          <p className="eyebrow">New patients · 12 weeks</p>
          <AreaChart
            data={m.newPatientsSeries}
            yLabel="New patients"
            color="var(--berry, #14834e)"
            height={220}
          />
        </div>

        <div className="chart-card">
          <p className="eyebrow">Revenue · by week</p>
          <BarChart data={m.revenueByWeekSeries} color="var(--gold, #f4a63c)" height={220} />
        </div>
      </div>

      {/* ---------------- Plan engagement: donut ---------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 2fr)",
          gap: 18,
        }}
      >
        <div
          className="chart-card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 12,
          }}
        >
          <p className="eyebrow" style={{ alignSelf: "flex-start" }}>
            Plan engagement
          </p>
          <DonutChart value={m.activePlanRate} label="on a plan" color="var(--berry, #14834e)" size={150} />
          <p className="muted" style={{ fontSize: 13, margin: 0, maxWidth: 240 }}>
            {m.activePlans} of {m.totalPatients} patients have an active care plan in progress.
          </p>
        </div>

        <div className="chart-card">
          <p className="eyebrow">Revenue · all-time</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
            <span className="serif" style={{ fontSize: 34, lineHeight: 1.05 }}>
              {money(m.revenueAllTime)}
            </span>
            <Delta pct={m.revenueDeltaPct} />
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            {money(m.revenue30d)} collected in the last 30 days, vs {money(m.revenuePrev30d)} the
            month before.
          </p>
          <div style={{ marginTop: 8 }}>
            <Sparkline
              data={m.revenueSpark}
              color="var(--gold, #f4a63c)"
              width={420}
              height={48}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
