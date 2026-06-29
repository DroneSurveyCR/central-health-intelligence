import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import WearableImport from "./WearableImport";
import Connections from "./Connections";
import DraftWithAiButton from "@/lib/ai/DraftWithAiButton";
import { aiEnabled } from "@/lib/ai";

type DailySummary = {
  id: string;
  connector_slug: string;
  date: string;
  resting_hr: number | null;
  hrv_ms: number | null;
  sleep_hours: number | null;
  sleep_efficiency: number | null;
  steps: number | null;
  readiness_score: number | null;
  spo2_avg: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  avg_glucose_mgdl: number | null;
  time_in_range_pct: number | null;
};

function fmt(v: number | null, suffix = ""): string {
  return v == null ? "—" : `${v}${suffix}`;
}

export default async function StaffWearablesPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  await requireModule("wearables");
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient) {
    return (
      <p className="muted">
        Client not found, or you don&apos;t have access.
      </p>
    );
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({
    action: "view",
    resource: "wearable_daily_summaries",
    patientId,
  });

  const { data } = await supabase
    .from("wearable_daily_summaries")
    .select(
      "id, connector_slug, date, resting_hr, hrv_ms, sleep_hours, sleep_efficiency, steps, readiness_score, spo2_avg, weight_kg, body_fat_pct, avg_glucose_mgdl, time_in_range_pct",
    )
    .eq("patient_id", patientId)
    .order("date", { ascending: false })
    .limit(90);

  const summaries = (data ?? []) as DailySummary[];
  const latest = summaries[0] ?? null;
  const hasGlucose =
    latest != null &&
    (latest.avg_glucose_mgdl != null || latest.time_in_range_pct != null);

  return (
    <div style={{ maxWidth: 900 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          {patient.first_name} {patient.last_name}
        </h1>
        <Link
          className="btn ghost"
          href={`/patients/${patientId}`}
          style={{ textDecoration: "none", padding: "4px 12px", fontSize: 14 }}
        >
          Back to record
        </Link>
      </div>
      <p className="muted">Wearables &amp; CGM</p>

      <div style={{ margin: "8px 0 4px" }}>
        <DraftWithAiButton
          endpoint="/api/ai/narrative"
          body={{ patientId }}
          label="Draft narrative with AI"
          aiEnabled={aiEnabled}
        />
      </div>

      <Connections patientId={patientId} />

      <WearableImport patientId={patientId} />

      {/* Latest-day snapshot */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Latest day{latest ? ` — ${latest.date}` : ""}
        </h2>
        {latest == null ? (
          <p className="muted" style={{ margin: 0 }}>
            No wearable data imported yet.
          </p>
        ) : (
          <div className="stat-grid">
            <div className="stat">
              <div className="label">Resting HR</div>
              <div className="value">{fmt(latest.resting_hr, " bpm")}</div>
            </div>
            <div className="stat">
              <div className="label">HRV</div>
              <div className="value">{fmt(latest.hrv_ms, " ms")}</div>
            </div>
            <div className="stat">
              <div className="label">Sleep</div>
              <div className="value">{fmt(latest.sleep_hours, " h")}</div>
            </div>
            <div className="stat">
              <div className="label">Steps</div>
              <div className="value">{fmt(latest.steps)}</div>
            </div>
            <div className="stat">
              <div className="label">Readiness</div>
              <div className="value">{fmt(latest.readiness_score)}</div>
            </div>
            {hasGlucose && (
              <>
                <div className="stat">
                  <div className="label">Avg glucose</div>
                  <div className="value">
                    {fmt(latest.avg_glucose_mgdl, " mg/dL")}
                  </div>
                </div>
                <div className="stat">
                  <div className="label">Time in range</div>
                  <div className="value">
                    {fmt(latest.time_in_range_pct, "%")}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* Daily timeline table */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Daily summaries
        </h2>
        {summaries.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No daily summaries yet.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                  <th style={th}>Date</th>
                  <th style={th}>Source</th>
                  <th style={th}>RHR</th>
                  <th style={th}>HRV</th>
                  <th style={th}>Sleep</th>
                  <th style={th}>Steps</th>
                  <th style={th}>Readiness</th>
                  <th style={th}>SpO₂</th>
                  <th style={th}>Glucose</th>
                  <th style={th}>TIR</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>{s.date}</td>
                    <td style={td}>
                      <span className="badge">{s.connector_slug}</span>
                    </td>
                    <td style={td}>{fmt(s.resting_hr)}</td>
                    <td style={td}>{fmt(s.hrv_ms)}</td>
                    <td style={td}>{fmt(s.sleep_hours)}</td>
                    <td style={td}>{fmt(s.steps)}</td>
                    <td style={td}>{fmt(s.readiness_score)}</td>
                    <td style={td}>{fmt(s.spo2_avg)}</td>
                    <td style={td}>{fmt(s.avg_glucose_mgdl)}</td>
                    <td style={td}>{fmt(s.time_in_range_pct, "%")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const th = { padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap" } as const;
const td = { padding: "6px 10px", whiteSpace: "nowrap" } as const;
