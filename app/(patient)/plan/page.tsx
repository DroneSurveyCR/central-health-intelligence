import { getCurrentPatient } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeCurrentPhase,
  groupItemsByPhaseAndLevel,
  planProgressPct,
  type Plan,
  type PlanLevel,
  type PlanPhase,
  type PlanItem,
} from "@/lib/plan/helpers";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t, type Lang } from "@/lib/i18n/dictionary";

const LEVEL_KEY: Record<PlanLevel, string> = {
  supplement: "level_supplement",
  modality: "level_modality",
  habit: "level_habit",
  measurement: "level_measurement",
};

function localizedLevelLabel(level: PlanLevel, lang: Lang): string {
  return t(LEVEL_KEY[level], lang);
}

export default async function PatientPlanPage() {
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const lang = await getServerLang();
  const locale = lang === "es" ? "es-CR" : "en-US";

  // Patients see their own active plan (RLS limits the query to their rows).
  const { data: plan } = (await supabase
    .from("plans")
    .select("id, patient_id, practitioner_id, title, start_date, end_date, status")
    .eq("patient_id", me.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: Plan | null };

  if (!plan) {
    return (
      <div style={{ maxWidth: 680 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: "0 0 6px" }}>
          {t("plan", lang)}
        </h1>
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>{t("plan_empty", lang)}</p>
        </div>
      </div>
    );
  }

  const [{ data: phaseRows }, { data: itemRows }] = await Promise.all([
    supabase
      .from("plan_phases")
      .select("id, plan_id, phase_number, name, start_offset_days, end_offset_days")
      .eq("plan_id", plan.id)
      .order("phase_number"),
    supabase
      .from("plan_items")
      .select("id, plan_id, phase_id, level, name, detail, dose")
      .eq("plan_id", plan.id),
  ]);

  const phases = (phaseRows ?? []) as PlanPhase[];
  const items = (itemRows ?? []) as PlanItem[];

  const today = new Date();
  const pct = planProgressPct(plan, today, phases);
  const currentPhase = computeCurrentPhase(plan, phases, today);
  const grouped = groupItemsByPhaseAndLevel(phases, items);

  const todaysItems = currentPhase
    ? items.filter((it) => it.phase_id === currentPhase.id)
    : [];
  const todaysGrouped = currentPhase
    ? groupItemsByPhaseAndLevel([currentPhase], todaysItems).phases[0]
    : null;

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        {plan.title ?? t("plan_title_default", lang)}
      </h1>
      <p className="muted">
        {t("plan_progress_pre", lang)} {pct}{t("plan_progress_post", lang)}
        {me.first_name ? `, ${me.first_name}` : ""} {t("plan_progress_tail", lang)}
      </p>

      {/* Progress bar */}
      <div style={{ marginTop: 14, height: 14, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "linear-gradient(90deg, var(--berry-l), var(--berry))",
            borderRadius: 999,
            transition: "width .3s ease",
          }}
        />
      </div>

      {/* Current phase + today's focus */}
      {currentPhase ? (
        <div className="card" style={{ marginTop: 22, borderColor: "var(--berry)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--berry)" }}>
            {t("plan_youre_in_phase", lang)} {currentPhase.phase_number}
          </div>
          <h2 className="serif" style={{ fontSize: 22, margin: "2px 0 0" }}>
            {currentPhase.name ?? `${t("plan_phase_word", lang)} ${currentPhase.phase_number}`}
          </h2>
          <h3 style={{ fontSize: 15, marginTop: 16, marginBottom: 4 }}>{t("plan_todays_focus", lang)}</h3>
          {todaysGrouped && todaysGrouped.itemCount > 0 ? (
            todaysGrouped.levels.map((gl) => (
              <FocusLevel key={gl.level} label={localizedLevelLabel(gl.level, lang)} items={gl.items} />
            ))
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              {t("plan_phase_empty", lang)}
            </p>
          )}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 22 }}>
          <p style={{ margin: 0 }}>
            {t("plan_ready_pre", lang)}{" "}
            {plan.start_date
              ? new Date(plan.start_date + "T00:00:00").toLocaleDateString(locale, {
                  month: "long",
                  day: "numeric",
                })
              : t("plan_your_start_date", lang)}
            .
          </p>
        </div>
      )}

      {/* Full breakdown */}
      <div style={{ marginTop: 26 }}>
        <h2 className="serif" style={{ fontSize: 19, margin: "0 0 10px" }}>
          {t("plan_full_plan", lang)}
        </h2>
        {grouped.phases.map((gp) => {
          const isCurrent = currentPhase?.id === gp.phase.id;
          return (
            <div
              key={gp.phase.id}
              className="card"
              style={{
                marginTop: 14,
                borderColor: isCurrent ? "var(--berry)" : "var(--line)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  {gp.phase.name ?? `${t("plan_phase_word", lang)} ${gp.phase.phase_number}`}
                </h3>
                {isCurrent && (
                  <span className="badge existing" style={{ fontSize: 10 }}>
                    {t("plan_current_badge", lang)}
                  </span>
                )}
              </div>
              {gp.itemCount === 0 ? (
                <p className="muted" style={{ margin: "8px 0 0" }}>{t("plan_no_items", lang)}</p>
              ) : (
                gp.levels.map((gl) => (
                  <FocusLevel key={gl.level} label={localizedLevelLabel(gl.level, lang)} items={gl.items} />
                ))
              )}
            </div>
          );
        })}
        {grouped.phases.length === 0 && grouped.unassigned.length > 0 && (
          <div className="card" style={{ marginTop: 14 }}>
            {grouped.unassigned.map((gl) => (
              <FocusLevel key={gl.level} label={localizedLevelLabel(gl.level, lang)} items={gl.items} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FocusLevel({ label, items }: { label: string; items: PlanItem[] }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--berry)", fontWeight: 700 }}>
        {label}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0" }}>
        {items.map((it) => (
          <li key={it.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontWeight: 600 }}>{it.name}</span>
            {it.dose && <span className="muted"> · {it.dose}</span>}
            {it.detail && <div className="muted" style={{ fontSize: 13 }}>{it.detail}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
