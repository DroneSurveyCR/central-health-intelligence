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
import { getEnabledModules } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import { computeStreak, checkMilestones, type MilestoneRow } from "@/lib/engagement/streaks";
import TodayClient, { type TodayItem, type TodayLevelGroup } from "./TodayClient";
import EngagementHeader from "./EngagementHeader";
import ProtocolQuickLog from "./ProtocolQuickLog";

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
    // No active plan — still surface engagement (streak/milestones/nudge) so
    // logging activity is recognised even before a plan is built.
    const engagementOn = (await getEnabledModules()).has("engagement");
    const engagement = engagementOn
      ? await loadEngagement(supabase, me.id, tz, lang)
      : null;
    return (
      <div style={{ maxWidth: 680 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: "0 0 6px" }}>
          {t("today_label", lang)} · {weekday}
        </h1>
        {engagement && (
          <EngagementHeader
            current={engagement.current}
            longest={engagement.longest}
            milestones={engagement.milestones}
            nudge={engagement.nudge}
            lang={lang}
          />
        )}
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

  // ---- ENGAGEMENT (always-on `engagement` module): streak + milestones + nudge ----
  const engagementOn = (await getEnabledModules()).has("engagement");
  const engagement = engagementOn
    ? await loadEngagement(supabase, me.id, tz, lang)
    : null;

  // Protocol-aware quick-log appears only with an active plan + engagement on.
  // (We have a plan here — this branch only renders when `plan` exists.)
  const peptideOn = engagementOn && (await getEnabledModules()).has("peptide");
  const showProtocolQuickLog = engagementOn && (levelGroups.length > 0 || peptideOn);
  // Did the patient already record a protocol dose today? (an 'adherence' log)
  let protocolLoggedToday = false;
  if (showProtocolQuickLog) {
    const { data: doseRows } = await supabase
      .from("progress_logs")
      .select("logged_at")
      .eq("patient_id", me.id)
      .eq("kind", "adherence")
      .gte("logged_at", `${todayISO}T00:00:00`)
      .limit(1);
    protocolLoggedToday = (doseRows ?? []).length > 0;
  }

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

      {engagement && (
        <EngagementHeader
          current={engagement.current}
          longest={engagement.longest}
          milestones={engagement.milestones}
          nudge={engagement.nudge}
          lang={lang}
        />
      )}

      {showProtocolQuickLog && (
        <ProtocolQuickLog
          alreadyLoggedToday={protocolLoggedToday}
          protocolLabel={phaseLabel}
        />
      )}

      <TodayClient
        todayISO={todayISO}
        phaseLabel={phaseLabel}
        levelGroups={levelGroups}
        firstName={me.first_name ?? null}
      />
    </div>
  );
}

type NudgeTone = "keep_streak" | "first" | "logged" | "sync_stale";

/**
 * Server-side engagement read: streak, recent milestones (idempotently topping
 * up any newly-earned ones), and ONE contextual nudge. RLS-scoped; the
 * milestone + log reads are audited as PHI access.
 */
async function loadEngagement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
  tz: string,
  _lang: Lang,
): Promise<{
  current: number;
  longest: number;
  milestones: MilestoneRow[];
  nudge: NudgeTone;
}> {
  const streak = await computeStreak(supabase, patientId, tz);

  // Top up any milestone this visit just qualified for (idempotent, best-effort).
  try {
    await checkMilestones(supabase, patientId, tz);
  } catch {
    /* never break the page over a milestone insert */
  }

  const { data: milestoneRows } = await supabase
    .from("patient_milestones")
    .select("kind, label, value, achieved_at")
    .eq("patient_id", patientId)
    .order("achieved_at", { ascending: false })
    .limit(3);

  await logAudit({ action: "view", resource: "patient_milestones", patientId });

  // Contextual nudge selection.
  let nudge: NudgeTone;
  if (streak.loggedToday) nudge = "logged";
  else if (streak.totalDays === 0) nudge = "first";
  else nudge = "keep_streak";

  return {
    current: streak.current,
    longest: streak.longest,
    milestones: (milestoneRows ?? []) as MilestoneRow[],
    nudge,
  };
}
