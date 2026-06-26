// Pure helpers for the 90-Day Plan engine. NO DB calls here — these are
// deterministic functions over already-loaded rows, safe to unit-test and
// to import from both server and client components.

export type PlanStatus = "draft" | "active" | "completed";
export type PlanLevel = "supplement" | "modality" | "habit" | "measurement";

export type Plan = {
  id: string;
  patient_id: string;
  practitioner_id: string | null;
  title: string | null;
  start_date: string | null; // ISO date (YYYY-MM-DD)
  end_date: string | null; // ISO date
  status: PlanStatus;
};

export type PlanPhase = {
  id: string;
  plan_id: string;
  phase_number: number;
  name: string | null;
  start_offset_days: number | null;
  end_offset_days: number | null;
};

export type PlanItem = {
  id: string;
  plan_id: string;
  phase_id: string | null;
  level: PlanLevel | null;
  name: string;
  detail: string | null;
  dose: string | null;
  schedule_json?: unknown;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Whole days from a plan's start_date to `today` (>= 0 once the plan has begun). */
function daysSinceStart(plan: Pick<Plan, "start_date">, today: Date): number | null {
  if (!plan.start_date) return null;
  const start = new Date(plan.start_date + "T00:00:00");
  if (Number.isNaN(start.getTime())) return null;
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  return Math.floor((t.getTime() - start.getTime()) / MS_PER_DAY);
}

/** Total length of the plan in days, derived from end_date or the phases' last offset. */
export function planLengthDays(
  plan: Pick<Plan, "start_date" | "end_date">,
  phases: PlanPhase[] = [],
): number | null {
  if (plan.start_date && plan.end_date) {
    const start = new Date(plan.start_date + "T00:00:00");
    const end = new Date(plan.end_date + "T00:00:00");
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const d = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
      if (d > 0) return d;
    }
  }
  // Fall back to the furthest phase offset.
  const maxOffset = phases.reduce(
    (m, p) => Math.max(m, p.end_offset_days ?? 0),
    0,
  );
  return maxOffset > 0 ? maxOffset : null;
}

/**
 * The phase whose [start_offset_days, end_offset_days) window covers
 * (today - start_date) in days. Returns null if the plan hasn't started, has
 * no datable start, or today is past every phase. Phases are matched in
 * phase_number order; the final phase is treated as inclusive of its end day
 * so the last day of the plan still resolves to a phase.
 */
export function computeCurrentPhase(
  plan: Pick<Plan, "start_date">,
  phases: PlanPhase[],
  today: Date,
): PlanPhase | null {
  const elapsed = daysSinceStart(plan, today);
  if (elapsed === null || elapsed < 0 || phases.length === 0) return null;

  const ordered = [...phases].sort((a, b) => a.phase_number - b.phase_number);
  const lastIndex = ordered.length - 1;

  for (let i = 0; i < ordered.length; i++) {
    const ph = ordered[i];
    const start = ph.start_offset_days ?? 0;
    const end = ph.end_offset_days ?? Number.POSITIVE_INFINITY;
    const coversEnd = i === lastIndex ? elapsed <= end : elapsed < end;
    if (elapsed >= start && coversEnd) return ph;
  }
  return null;
}

/** Plan progress as an integer 0..100 based on elapsed days over plan length. */
export function planProgressPct(
  plan: Pick<Plan, "start_date" | "end_date" | "status">,
  today: Date,
  phases: PlanPhase[] = [],
): number {
  if (plan.status === "completed") return 100;
  const elapsed = daysSinceStart(plan, today);
  const length = planLengthDays(plan, phases);
  if (elapsed === null || length === null || length <= 0) return 0;
  if (elapsed <= 0) return 0;
  const pct = Math.round((elapsed / length) * 100);
  return Math.min(100, Math.max(0, pct));
}

export type GroupedLevel = { level: PlanLevel; items: PlanItem[] };
export type GroupedPhase = {
  phase: PlanPhase;
  levels: GroupedLevel[];
  itemCount: number;
};

const LEVEL_ORDER: PlanLevel[] = [
  "supplement",
  "modality",
  "habit",
  "measurement",
];

/**
 * Groups items first by phase (ordered by phase_number) then by level (ordered
 * supplement → modality → habit → measurement). Items whose phase_id matches no
 * provided phase, or is null, are collected under an `unassigned` bucket.
 */
export function groupItemsByPhaseAndLevel(
  phases: PlanPhase[],
  items: PlanItem[],
): { phases: GroupedPhase[]; unassigned: GroupedLevel[] } {
  const ordered = [...phases].sort((a, b) => a.phase_number - b.phase_number);
  const phaseIds = new Set(ordered.map((p) => p.id));

  const groupLevels = (subset: PlanItem[]): GroupedLevel[] => {
    const byLevel = new Map<PlanLevel, PlanItem[]>();
    for (const it of subset) {
      const lvl = (it.level ?? "habit") as PlanLevel;
      const arr = byLevel.get(lvl) ?? [];
      arr.push(it);
      byLevel.set(lvl, arr);
    }
    return LEVEL_ORDER.filter((l) => byLevel.has(l)).map((level) => ({
      level,
      items: byLevel.get(level)!,
    }));
  };

  const groupedPhases: GroupedPhase[] = ordered.map((phase) => {
    const subset = items.filter((it) => it.phase_id === phase.id);
    return {
      phase,
      levels: groupLevels(subset),
      itemCount: subset.length,
    };
  });

  const unassignedItems = items.filter(
    (it) => !it.phase_id || !phaseIds.has(it.phase_id),
  );

  return { phases: groupedPhases, unassigned: groupLevels(unassignedItems) };
}

/** Human label for a level, used across the staff + patient views. */
export function levelLabel(level: PlanLevel): string {
  return (
    {
      supplement: "Supplements",
      modality: "Modalities",
      habit: "Habits",
      measurement: "Measurements",
    }[level] ?? level
  );
}
