import { getCurrentPatient } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LineChart, BarChart, AreaChart, DonutChart } from "@/lib/charts/Charts";
import {
  feelingSeries,
  bpSeries,
  adherenceByDay,
  type ProgressLog,
  type PlanCompletion,
} from "@/lib/progress/aggregate";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";

const FEELING_DAYS = 30;
const ADHERENCE_DAYS = 14;

export default async function PatientProgressPage() {
  const lang = await getServerLang();
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  const supabase = await createClient();

  const since30 = new Date();
  since30.setDate(since30.getDate() - FEELING_DAYS);
  const since14 = new Date();
  since14.setDate(since14.getDate() - ADHERENCE_DAYS);

  // RLS scopes every query to this patient's own rows.
  const [{ data: logs }, { data: completions }, { data: activePlan }] =
    await Promise.all([
      supabase
        .from("progress_logs")
        .select("kind, value_json, logged_at")
        .eq("patient_id", me.id)
        .gte("logged_at", since30.toISOString())
        .order("logged_at", { ascending: true }),
      supabase
        .from("plan_completions")
        .select("date, completed")
        .eq("patient_id", me.id)
        .gte("date", since14.toISOString().slice(0, 10)),
      supabase
        .from("plans")
        .select("id")
        .eq("patient_id", me.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  let itemCount = 0;
  if (activePlan?.id) {
    const { count } = await supabase
      .from("plan_items")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", activePlan.id);
    itemCount = count ?? 0;
  }

  const feeling = feelingSeries((logs ?? []) as ProgressLog[]);
  const bp = bpSeries((logs ?? []) as ProgressLog[]);
  const adherence = adherenceByDay(
    (completions ?? []) as PlanCompletion[],
    itemCount,
    ADHERENCE_DAYS,
  );

  const hasAnything =
    feeling.length > 0 || bp.systolic.length > 0 || itemCount > 0;

  // Quick-tile + donut metrics (defensive against empty series).
  const feelingVals = feeling
    .map((p) => p.y)
    .filter((y): y is number => y != null && Number.isFinite(y));
  const avgFeeling =
    feelingVals.length > 0
      ? Math.round((feelingVals.reduce((a, b) => a + b, 0) / feelingVals.length) * 10) / 10
      : null;

  const lastSys = [...bp.systolic].reverse().find((p) => p.y != null)?.y ?? null;
  const lastDia = [...bp.diastolic].reverse().find((p) => p.y != null)?.y ?? null;
  const latestBp = lastSys != null && lastDia != null ? `${lastSys}/${lastDia}` : null;

  const adherenceVals = adherence.map((b) => b.value).filter((v) => Number.isFinite(v));
  const avgAdherence =
    itemCount > 0 && adherenceVals.length > 0
      ? Math.round(adherenceVals.reduce((a, b) => a + b, 0) / adherenceVals.length)
      : null;

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        {t("progress_title", lang)}
      </h1>
      <p className="muted">
        {t("progress_intro_pre", lang)}
        {me.first_name ? `, ${me.first_name}` : ""}.
      </p>

      {!hasAnything ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p style={{ margin: 0 }}>
            {t("progress_empty", lang)}
          </p>
        </div>
      ) : (
        <>
          {/* Quick stat tiles */}
          <div className="stat-grid" style={{ marginTop: 20 }}>
            <div className="stat">
              <div className="label">{t("progress_feeling_title", lang)}</div>
              <div className="value">
                {avgFeeling != null ? avgFeeling : "—"}
                {avgFeeling != null ? (
                  <span style={{ fontSize: 16, fontWeight: 500, color: "var(--muted)" }}> /10</span>
                ) : null}
              </div>
            </div>
            <div className="stat">
              <div className="label">{t("progress_bp_title", lang)}</div>
              <div className="value">
                {latestBp ?? "—"}
                {latestBp != null ? (
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}> mmHg</span>
                ) : null}
              </div>
            </div>
            <div className="stat">
              <div className="label">{t("progress_adherence_title", lang)}</div>
              <div className="value">
                {avgAdherence != null ? `${avgAdherence}%` : "—"}
              </div>
            </div>
          </div>

          {/* Feeling trend */}
          <section className="chart-card" style={{ marginTop: 16 }}>
            <p className="eyebrow">{t("progress_feeling_title", lang)}</p>
            <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
              {t("progress_feeling_hint_pre", lang)} {FEELING_DAYS} {t("progress_days", lang)}.
            </p>
            {feeling.length > 0 ? (
              <AreaChart
                data={feeling}
                color="var(--berry, #14834e)"
                yLabel={t("progress_feeling_ylabel", lang)}
              />
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t("progress_feeling_empty", lang)}
              </p>
            )}
          </section>

          {/* Blood pressure trend */}
          <section className="chart-card" style={{ marginTop: 16 }}>
            <p className="eyebrow">{t("progress_bp_title", lang)}</p>
            <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
              {t("progress_bp_hint", lang)}
            </p>
            {bp.systolic.length > 0 || bp.diastolic.length > 0 ? (
              <LineChart
                data={bp.systolic}
                color="var(--berry, #14834e)"
                yLabel="mmHg"
                series={[
                  {
                    data: bp.systolic,
                    color: "var(--berry, #14834e)",
                    name: t("progress_bp_systolic", lang),
                  },
                  {
                    data: bp.diastolic,
                    color: "var(--gold, #f4a63c)",
                    name: t("progress_bp_diastolic", lang),
                  },
                ]}
              />
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t("progress_bp_empty", lang)}
              </p>
            )}
          </section>

          {/* Adherence */}
          <section className="chart-card" style={{ marginTop: 16 }}>
            <p className="eyebrow">{t("progress_adherence_title", lang)}</p>
            <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
              {t("progress_adherence_hint_pre", lang)} {ADHERENCE_DAYS} {t("progress_days", lang)}.
            </p>
            {itemCount > 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  flexWrap: "wrap",
                }}
              >
                {avgAdherence != null ? (
                  <DonutChart
                    value={avgAdherence}
                    size={108}
                    color="var(--gold, #f4a63c)"
                    track="rgba(244,166,60,0.16)"
                  />
                ) : null}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <BarChart data={adherence} color="var(--gold, #f4a63c)" max={100} />
                </div>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t("progress_adherence_empty", lang)}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
