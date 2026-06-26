import { getCurrentPatient } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeCurrentPhase,
  groupItemsByPhaseAndLevel,
  type Plan,
  type PlanLevel,
  type PlanPhase,
  type PlanItem,
} from "@/lib/plan/helpers";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t, type Lang } from "@/lib/i18n/dictionary";
import { getPractice } from "@/lib/practice";
import TodayClient, { type TodayItem, type TodayLevelGroup } from "./TodayClient";

const LEVEL_KEY: Record<PlanLevel, string> = {
  supplement: "level_supplement",
  modality: "level_modality",
  habit: "level_habit",
  measurement: "level_measurement",
};

function localizedLevelLabel(level: PlanLevel, lang: Lang): string {
  return t(LEVEL_KEY[level], lang);
}

type CompletionRow = {
  plan_item_id: string;
  completed: boolean;
};

export default async function PatientTodayPage() {
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const lang = await getServerLang();
  const locale = lang === "es" ? "es-CR" : "en-US";

  // Resolve "today" in the practice's timezone, not UTC. Using UTC here would
  // roll the calendar day over in the evening for a non-UTC clinic, corrupting
  // completion lookups/writes. Fall back to Costa Rica if no timezone is set.
  const practice = await getPractice();
  const tz = practice?.timezone || "America/Costa_Rica";
  const now = new Date();
  const todayISO = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
  const weekday = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: "long",
  }).format(now);
  const niceDate = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    month: "long",
    day: "numeric",
  }).format(now);

  // A Date anchored at midnight of the practice-local "today", so phase math
  // (computeCurrentPhase) agrees with todayISO instead of drifting on UTC.
  const todayLocal = new Date(todayISO + "T00:00:00");

  // The patient's active plan (RLS limits this to their own rows).
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
          {t("today_label", lang)} · {weekday}
        </h1>
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>{t("today_no_plan", lang)}</p>
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

  const currentPhase = computeCurrentPhase(plan, phases, todayLocal);

  const phaseItems = currentPhase
    ? items.filter((it) => it.phase_id === currentPhase.id)
    : [];

  // Today's completion state for the current phase's items.
  const itemIds = phaseItems.map((it) => it.id);
  let completionByItem = new Map<string, boolean>();
  if (itemIds.length > 0) {
    const { data: completionRows } = (await supabase
      .from("plan_completions")
      .select("plan_item_id, completed")
      .eq("patient_id", me.id)
      .eq("date", todayISO)
      .in("plan_item_id", itemIds)) as { data: CompletionRow[] | null };
    completionByItem = new Map(
      (completionRows ?? []).map((c) => [c.plan_item_id, c.completed]),
    );
  }

  // Group the current phase's items by level (supplement → modality → habit → measurement).
  const grouped = currentPhase
    ? groupItemsByPhaseAndLevel([currentPhase], phaseItems).phases[0]
    : null;

  const levelGroups: TodayLevelGroup[] = grouped
    ? grouped.levels.map((gl) => ({
        level: gl.level,
        label: localizedLevelLabel(gl.level, lang),
        items: gl.items.map(
          (it): TodayItem => ({
            id: it.id,
            name: it.name,
            detail: it.detail,
            dose: it.dose,
            completed: completionByItem.get(it.id) ?? false,
          }),
        ),
      }))
    : [];

  const phaseLabel = currentPhase
    ? currentPhase.name ?? `${t("plan_phase_word", lang)} ${currentPhase.phase_number}`
    : null;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--berry)" }}>
        {niceDate}
      </div>
      <h1 className="serif" style={{ fontSize: 28, margin: "2px 0 4px" }}>
        {t("today_label", lang)} · {weekday}
      </h1>
      <p className="muted" style={{ margin: 0 }}>
        {me.first_name ? `${t("today_greeting", lang)}, ${me.first_name}. ` : ""}
        {phaseLabel
          ? `${t("today_focus_intro", lang)} ${phaseLabel}. ${t("today_focus_tagline", lang)}`
          : t("today_fresh_day", lang)}
      </p>

      <TodayClient
        todayISO={todayISO}
        phaseLabel={phaseLabel}
        levelGroups={levelGroups}
        firstName={me.first_name ?? null}
      />
    </div>
  );
}
