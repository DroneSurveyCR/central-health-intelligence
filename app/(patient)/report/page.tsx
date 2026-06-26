import { getCurrentPatient } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t, type Lang } from "@/lib/i18n/dictionary";
import PrintButton from "@/components/PrintButton";
import { rangeBarPosition, type LabResult } from "@/lib/labs/helpers";
import { DonutChart, Sparkline } from "@/lib/charts/Charts";
import {
  buildReport,
  type Report,
  type ReportLab,
  type ScanSystems,
  type ScanFinding,
  type ReportPlanPhase,
} from "@/lib/report/build";

const BERRY = "#14834e";
const RUST = "#e0613b";
const GOLD = "#f4a63c";

export default async function PatientReportPage() {
  const lang = await getServerLang();
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const report = await buildReport(supabase, me.id);

  // Full per-marker lab history (one query) to power trend sparklines. RLS
  // scopes this to the patient's own rows; ordered oldest → newest.
  const { data: labReadings } = await supabase
    .from("lab_results")
    .select("marker, value, collected_on, created_at")
    .eq("patient_id", me.id)
    .order("collected_on", { ascending: true });
  const readingsByMarker = new Map<string, number[]>();
  for (const r of (labReadings ?? []) as Pick<LabResult, "marker" | "value">[]) {
    if (typeof r.value !== "number" || !Number.isFinite(r.value)) continue;
    const list = readingsByMarker.get(r.marker) ?? [];
    list.push(r.value);
    readingsByMarker.set(r.marker, list);
  }

  await logAudit({ action: "view", resource: "report", patientId: me.id });

  if (!report) {
    return (
      <div className="report" style={{ maxWidth: 760 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: "0 0 8px" }}>
          {t("report_hero_title", lang)}
        </h1>
        <div className="card">
          <p style={{ margin: 0 }}>{t("report_empty", lang)}</p>
        </div>
      </div>
    );
  }

  return <ReportView report={report} lang={lang} readingsByMarker={readingsByMarker} />;
}

/* =========================================================================
 * Shared, reusable report view + section components (also used by staff page)
 * ========================================================================= */

export function ReportView({
  report,
  lang,
  readingsByMarker,
}: {
  report: Report;
  lang: Lang;
  readingsByMarker?: Map<string, number[]>;
}) {
  return (
    <div className="report" style={{ maxWidth: 820, margin: "0 auto" }}>
      <ReportHero report={report} lang={lang} />
      <JourneySection report={report} lang={lang} />
      <LabsSection report={report} lang={lang} readingsByMarker={readingsByMarker} />
      <ScanSection report={report} lang={lang} />
      <WellbeingSection report={report} lang={lang} />
      <PlanSection report={report} lang={lang} />
      <ReportFooter lang={lang} />
    </div>
  );
}

/* ------------------------------- hero ------------------------------------- */

export function ReportHero({ report, lang }: { report: Report; lang: Lang }) {
  const { patient, plan } = report;
  return (
    <header
      style={{
        background:
          "linear-gradient(135deg, rgba(20,131,78,0.10), rgba(244,166,60,0.14))",
        border: "1px solid var(--line)",
        borderRadius: 22,
        padding: "30px 28px",
        marginBottom: 22,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            className="muted"
            style={{
              margin: 0,
              fontSize: 12,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--berry)",
            }}
          >
            {t("report", lang)}
          </p>
          <h1
            className="serif"
            style={{ fontSize: 36, margin: "6px 0 2px", lineHeight: 1.1 }}
          >
            {t("report_hero_title", lang)}
          </h1>
          <p className="serif" style={{ margin: 0, fontSize: 18, color: "var(--ink)" }}>
            {t("report_hero_sub", lang)}
          </p>
        </div>
        <PrintButton label={t("report_print", lang)} />
      </div>

      <div
        style={{
          display: "flex",
          gap: 22,
          flexWrap: "wrap",
          marginTop: 20,
          paddingTop: 18,
          borderTop: "1px solid rgba(30,58,48,0.10)",
          fontSize: 14,
        }}
      >
        <div>
          <span className="muted">{t("report_for", lang)}: </span>
          <b>{patient.name}</b>
          {patient.age != null ? (
            <span className="muted">
              {" "}
              · {t("report_age", lang)} {patient.age}
            </span>
          ) : null}
          {patient.sex ? (
            <span className="muted" style={{ textTransform: "capitalize" }}>
              {" "}
              · {patient.sex}
            </span>
          ) : null}
        </div>
        {plan ? (
          <div>
            <span className="muted">{plan.title}</span>
            {plan.dateRange.start || plan.dateRange.end ? (
              <span className="muted">
                {" "}
                ·{" "}
                {fmtDate(plan.dateRange.start, lang)} – {fmtDate(plan.dateRange.end, lang)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/* ------------------------------ section shell ----------------------------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="serif"
      style={{ fontSize: 22, margin: "0 0 4px", color: "var(--ink)" }}
    >
      {children}
    </h2>
  );
}

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 30 }}>
      <SectionTitle>{title}</SectionTitle>
      {intro ? (
        <p className="muted" style={{ margin: "0 0 14px", fontSize: 14 }}>
          {intro}
        </p>
      ) : (
        <div style={{ height: 12 }} />
      )}
      {children}
    </section>
  );
}

/* ------------------------------- journey ---------------------------------- */

export function JourneySection({ report, lang }: { report: Report; lang: Lang }) {
  const { plan } = report;
  return (
    <Section title={t("report_journey_title", lang)}>
      {!plan ? (
        <div className="card">
          <p style={{ margin: 0 }}>{t("report_journey_none", lang)}</p>
        </div>
      ) : (
        <div className="card report-row">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                {t("report_journey_phase", lang)}
              </p>
              <p className="serif" style={{ margin: "2px 0 0", fontSize: 20 }}>
                {plan.currentPhase ?? plan.title}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ textAlign: "right" }}>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  {t("report_journey_progress", lang)}
                </p>
                <p
                  className="serif"
                  style={{ margin: "2px 0 0", fontSize: 28, color: BERRY }}
                >
                  {plan.progressPct}%
                </p>
              </div>
              <DonutChart value={plan.progressPct} size={84} />
            </div>
          </div>
          <div
            style={{
              marginTop: 14,
              height: 14,
              borderRadius: 999,
              background: "var(--sand)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${plan.progressPct}%`,
                background: `linear-gradient(90deg, ${BERRY}, ${GOLD})`,
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      )}
    </Section>
  );
}

/* -------------------------------- labs ------------------------------------ */

export function LabsSection({
  report,
  lang,
  readingsByMarker,
}: {
  report: Report;
  lang: Lang;
  readingsByMarker?: Map<string, number[]>;
}) {
  const { labs } = report;
  return (
    <Section
      title={t("report_labs_title", lang)}
      intro={t("report_labs_intro", lang)}
    >
      {labs.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>{t("report_labs_empty", lang)}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {labs.map((lab) => (
            <LabRow
              key={lab.marker}
              lab={lab}
              lang={lang}
              readings={readingsByMarker?.get(lab.marker) ?? []}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function LabRow({
  lab,
  lang,
  readings = [],
}: {
  lab: ReportLab;
  lang: Lang;
  readings?: number[];
}) {
  const inRange = lab.status === "optimal";
  const statusColor = inRange ? BERRY : RUST;
  const statusKey =
    lab.status === "optimal"
      ? "report_status_optimal"
      : lab.status === "below"
        ? "report_status_below"
        : "report_status_above";

  const trendColor =
    lab.trend === "improving" ? BERRY : lab.trend === "worsening" ? RUST : "var(--muted)";
  const trendArrow =
    lab.trend === "improving" ? "↑" : lab.trend === "worsening" ? "↓" : "→";
  const trendKey =
    lab.trend === "improving"
      ? "report_trend_improving"
      : lab.trend === "worsening"
        ? "report_trend_worsening"
        : "report_trend_flat";

  const pos = rangeBarPosition(lab.latest.value, lab.optimalLow, lab.optimalHigh);
  const bandLeft = Math.min(pos.bandLowPct, pos.bandHighPct);
  const bandWidth = Math.abs(pos.bandHighPct - pos.bandLowPct);

  const rangeText =
    lab.optimalLow != null && lab.optimalHigh != null
      ? `${lab.optimalLow}–${lab.optimalHigh}${lab.unit ? ` ${lab.unit}` : ""}`
      : lab.optimalLow != null
        ? `≥ ${lab.optimalLow}${lab.unit ? ` ${lab.unit}` : ""}`
        : lab.optimalHigh != null
          ? `≤ ${lab.optimalHigh}${lab.unit ? ` ${lab.unit}` : ""}`
          : null;

  return (
    <div className="card report-row">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700 }}>{lab.marker}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            background: statusColor,
            borderRadius: 999,
            padding: "3px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {t(statusKey, lang)}
        </span>
      </div>

      {/* baseline → now */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          margin: "12px 0 10px",
          flexWrap: "wrap",
        }}
      >
        {lab.baseline ? (
          <>
            <ValueBlock
              label={t("report_baseline", lang)}
              value={lab.baseline.value}
              unit={lab.unit}
              date={lab.baseline.date}
              lang={lang}
              muted
            />
            <span style={{ fontSize: 24, color: trendColor, fontWeight: 700 }}>→</span>
            <ValueBlock
              label={t("report_now", lang)}
              value={lab.latest.value}
              unit={lab.unit}
              date={lab.latest.date}
              lang={lang}
              color={statusColor}
            />
          </>
        ) : (
          <ValueBlock
            label={t("report_now", lang)}
            value={lab.latest.value}
            unit={lab.unit}
            date={lab.latest.date}
            lang={lang}
            color={statusColor}
          />
        )}
        {lab.baseline ? (
          <span
            style={{
              marginLeft: "auto",
              color: trendColor,
              fontWeight: 700,
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            {trendArrow} {t(trendKey, lang)}
          </span>
        ) : null}
      </div>

      {/* range bar */}
      <div
        style={{
          position: "relative",
          height: 9,
          borderRadius: 999,
          background: "var(--sand)",
          border: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${bandLeft}%`,
            width: `${bandWidth}%`,
            background: "rgba(20,131,78,0.28)",
            borderLeft: `2px solid ${BERRY}`,
            borderRight: `2px solid ${BERRY}`,
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${pos.valuePct}%`,
            width: 13,
            height: 13,
            borderRadius: "50%",
            background: statusColor,
            border: "2px solid var(--paper)",
            boxShadow: "0 1px 3px rgba(30,58,48,0.3)",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginTop: 8,
        }}
      >
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          {rangeText
            ? `${t("report_optimal", lang)}: ${rangeText}`
            : t("report_single_reading", lang)}
          {!lab.baseline && rangeText ? ` · ${t("report_single_reading", lang)}` : ""}
        </p>
        {readings.length >= 2 ? (
          <Sparkline
            data={readings}
            color={lab.trend === "worsening" ? RUST : BERRY}
            width={108}
            height={28}
          />
        ) : null}
      </div>
    </div>
  );
}

function ValueBlock({
  label,
  value,
  unit,
  date,
  lang,
  color,
  muted,
}: {
  label: string;
  value: number;
  unit: string | null;
  date: string | null;
  lang: Lang;
  color?: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="muted" style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </p>
      <p
        className="serif"
        style={{
          margin: "1px 0 0",
          fontSize: 26,
          fontWeight: 600,
          color: muted ? "var(--muted)" : (color ?? "var(--ink)"),
          lineHeight: 1,
        }}
      >
        {value}
        {unit ? (
          <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 3 }}>{unit}</span>
        ) : null}
      </p>
      {date ? (
        <p className="muted" style={{ margin: "3px 0 0", fontSize: 11 }}>
          {fmtDate(date, lang)}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------ body scan --------------------------------- */

export function ScanSection({ report, lang }: { report: Report; lang: Lang }) {
  const { scanProgress } = report;
  return (
    <Section title={t("report_scan_title", lang)}>
      {!scanProgress ? (
        <div className="card">
          <p style={{ margin: 0 }}>{t("report_scan_empty", lang)}</p>
        </div>
      ) : scanProgress.kind === "beforeAfter" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
          className="report-scan-grid"
        >
          <ScanCard
            heading={t("report_scan_before", lang)}
            sys={scanProgress.before}
            lang={lang}
            tone="muted"
          />
          <ScanCard
            heading={t("report_scan_after", lang)}
            sys={scanProgress.after}
            lang={lang}
            tone="good"
          />
        </div>
      ) : (
        <div className="card report-row">
          <p className="muted" style={{ margin: "0 0 8px", fontSize: 12 }}>
            {fmtDate(scanProgress.date, lang)} · {t("report_scan_current", lang)}
          </p>
          {scanProgress.findings.length === 0 ? (
            <p style={{ margin: 0 }}>{t("report_scan_clear", lang)}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              {scanProgress.findings.map((f, i) => (
                <FindingItem key={i} f={f} />
              ))}
            </ul>
          )}
        </div>
      )}
    </Section>
  );
}

function ScanCard({
  heading,
  sys,
  lang,
  tone,
}: {
  heading: string;
  sys: ScanSystems;
  lang: Lang;
  tone: "muted" | "good";
}) {
  return (
    <div
      className="card report-row"
      style={{
        borderTop: `3px solid ${tone === "good" ? BERRY : "var(--line)"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          className="serif"
          style={{ fontSize: 18, color: tone === "good" ? BERRY : "var(--muted)" }}
        >
          {heading}
        </span>
        <span className="muted" style={{ fontSize: 12 }}>
          {fmtDate(sys.date, lang)}
        </span>
      </div>
      <p
        className="muted"
        style={{ margin: "10px 0 6px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {t("report_scan_systems", lang)}
      </p>
      {sys.systems.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: BERRY }}>
          {t("report_scan_none_flagged", lang)}
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {sys.systems.map((s) => (
            <span
              key={s}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                textTransform: "capitalize",
                background: tone === "good" ? "rgba(20,131,78,0.12)" : "var(--sand)",
                color: tone === "good" ? BERRY : "var(--ink)",
                border: "1px solid var(--line)",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FindingItem({ f }: { f: ScanFinding }) {
  return (
    <li style={{ marginBottom: 6 }}>
      <b style={{ textTransform: "capitalize" }}>{f.system ?? "General"}</b>
      {f.severity ? <span className="muted"> — {f.severity}</span> : null}
      {f.text ? `. ${f.text}` : "."}
    </li>
  );
}

/* ------------------------------- wellbeing -------------------------------- */

export function WellbeingSection({ report, lang }: { report: Report; lang: Lang }) {
  const { wellbeing } = report;
  const hasFeel = wellbeing.avgFeelStart != null || wellbeing.avgFeelRecent != null;
  const hasAdherence = wellbeing.adherencePct != null;

  return (
    <Section title={t("report_wellbeing_title", lang)}>
      {!hasFeel && !hasAdherence ? (
        <div className="card">
          <p style={{ margin: 0 }}>{t("report_wellbeing_empty", lang)}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="report-scan-grid">
          {hasFeel ? (
            <div className="card report-row">
              <p
                className="muted"
                style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                {t("report_feel_scale", lang)}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <FeelBlock
                  label={t("report_feel_then", lang)}
                  value={wellbeing.avgFeelStart}
                  muted
                />
                {wellbeing.avgFeelStart != null && wellbeing.avgFeelRecent != null ? (
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color:
                        wellbeing.avgFeelRecent >= wellbeing.avgFeelStart ? BERRY : RUST,
                    }}
                  >
                    →
                  </span>
                ) : null}
                <FeelBlock
                  label={t("report_feel_now", lang)}
                  value={wellbeing.avgFeelRecent}
                  color={BERRY}
                />
              </div>
            </div>
          ) : null}

          {hasAdherence ? (
            <div className="card report-row">
              <p
                className="muted"
                style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                {t("report_adherence", lang)}
              </p>
              <p
                className="serif"
                style={{ margin: "8px 0 0", fontSize: 40, color: GOLD, lineHeight: 1 }}
              >
                {wellbeing.adherencePct}%
              </p>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                {t("report_adherence_sub", lang)}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </Section>
  );
}

function FeelBlock({
  label,
  value,
  color,
  muted,
}: {
  label: string;
  value: number | null;
  color?: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="muted" style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </p>
      <p
        className="serif"
        style={{
          margin: "2px 0 0",
          fontSize: 30,
          fontWeight: 600,
          color: muted ? "var(--muted)" : (color ?? "var(--ink)"),
          lineHeight: 1,
        }}
      >
        {value != null ? value : "—"}
        {value != null ? <span style={{ fontSize: 14, fontWeight: 500 }}> /10</span> : null}
      </p>
    </div>
  );
}

/* --------------------------------- plan ----------------------------------- */

const LEVEL_KEY: Record<string, string> = {
  supplement: "report_level_supplement",
  modality: "report_level_modality",
  habit: "report_level_habit",
  measurement: "report_level_measurement",
};

export function PlanSection({ report, lang }: { report: Report; lang: Lang }) {
  const phases = report.planItemsByLevel;
  return (
    <Section title={t("report_plan_title", lang)}>
      {phases.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>{t("report_plan_empty", lang)}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {phases.map((phase) => (
            <PlanPhaseCard key={`${phase.phaseNumber}-${phase.name}`} phase={phase} lang={lang} />
          ))}
        </div>
      )}
    </Section>
  );
}

function PlanPhaseCard({ phase, lang }: { phase: ReportPlanPhase; lang: Lang }) {
  return (
    <div className="card report-row">
      <h3 className="serif" style={{ margin: "0 0 10px", fontSize: 18 }}>
        {phase.name}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {phase.levels.map((lvl) => (
          <div key={lvl.level}>
            <p
              style={{
                margin: "0 0 6px",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "var(--berry)",
              }}
            >
              {t(LEVEL_KEY[lvl.level] ?? lvl.level, lang)}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              {lvl.items.map((it, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <b>{it.name}</b>
                  {it.dose ? <span className="muted"> · {it.dose}</span> : null}
                  {it.detail ? <span className="muted"> — {it.detail}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- footer ---------------------------------- */

function ReportFooter({ lang }: { lang: Lang }) {
  return (
    <p
      className="muted"
      style={{ margin: "32px 0 0", fontSize: 12, textAlign: "center" }}
    >
      {t("report_generated", lang)}: {fmtDate(new Date().toISOString(), lang)}
    </p>
  );
}

/* -------------------------------- utils ----------------------------------- */

export function fmtDate(iso: string | null, lang: Lang): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(lang === "es" ? "es-CR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
