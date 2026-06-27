// HealthSync Cloud — patient ENGAGEMENT engine: streaks + milestones.
//
// Part of the always-on `engagement` module. Pure, RLS-respecting helpers:
// every query runs through the caller's own Supabase client, so a patient only
// ever sees / writes their own rows. No service-role, no cross-tenant reads.
//
// "A logging day" = any day the patient produced engagement activity. We count
// BOTH a `progress_logs` row (how-I-feel, vital, adherence, measurement) AND a
// completed `plan_completions` row, because either is a deliberate daily action.
// Days are bucketed in a fixed timezone so the streak doesn't drift at the UTC
// midnight boundary for an evening logger.

import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Default practice timezone (Costa Rica) — matches /today's fallback. */
const DEFAULT_TZ = "America/Costa_Rica";

/** How far back we look when computing a streak. A 1-year window is plenty and
 *  keeps the row scan bounded even for very active patients. */
const LOOKBACK_DAYS = 400;

export type StreakResult = {
  /** Consecutive logging days ending today (or yesterday — see grace note). */
  current: number;
  /** Longest run of consecutive logging days ever seen in the window. */
  longest: number;
  /** Whether the patient has already logged on the current local day. */
  loggedToday: boolean;
  /** Total distinct days with any logging activity in the window. */
  totalDays: number;
  /** ISO date (YYYY-MM-DD) of the most recent logging day, or null. */
  lastLogDate: string | null;
};

/** YYYY-MM-DD for an instant in a given IANA timezone. */
function localDay(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
}

/** Subtract n days from a YYYY-MM-DD string, returning YYYY-MM-DD. */
function addDays(iso: string, n: number): string {
  const dt = new Date(iso + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * Compute the patient's current + longest consecutive-day logging streak from
 * the existing logging tables (progress_logs + plan_completions). RLS-scoped.
 */
export async function computeStreak(
  client: SupabaseServer,
  patientId: string,
  tz: string = DEFAULT_TZ,
): Promise<StreakResult> {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);
  const sinceISO = since.toISOString();
  const sinceDate = sinceISO.slice(0, 10);

  const [{ data: logs }, { data: completions }] = await Promise.all([
    client
      .from("progress_logs")
      .select("logged_at")
      .eq("patient_id", patientId)
      .gte("logged_at", sinceISO)
      .order("logged_at", { ascending: false }),
    client
      .from("plan_completions")
      .select("date")
      .eq("patient_id", patientId)
      .eq("completed", true)
      .gte("date", sinceDate),
  ]);

  // Collapse all activity into a set of distinct local logging-days.
  const days = new Set<string>();
  for (const r of (logs ?? []) as { logged_at: string }[]) {
    if (r.logged_at) days.add(localDay(new Date(r.logged_at), tz));
  }
  for (const r of (completions ?? []) as { date: string }[]) {
    if (r.date) days.add(r.date); // plan_completions.date is already a local date
  }

  const sorted = [...days].sort(); // ascending YYYY-MM-DD (lexicographic == chronological)
  const totalDays = sorted.length;
  const lastLogDate = totalDays > 0 ? sorted[sorted.length - 1] : null;

  // Longest run of consecutive days anywhere in the window.
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    if (prev !== null && addDays(prev, 1) === day) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    prev = day;
  }

  // Current streak: walk backwards from today. Grace: if they haven't logged
  // *today* yet but logged *yesterday*, the streak is still alive — we anchor
  // the walk at yesterday so the badge doesn't read 0 first thing in the morning.
  const today = localDay(new Date(), tz);
  const loggedToday = days.has(today);
  let current = 0;
  if (totalDays > 0) {
    let cursor = loggedToday ? today : addDays(today, -1);
    while (days.has(cursor)) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  return { current, longest, loggedToday, totalDays, lastLogDate };
}

export type MilestoneRow = {
  kind: string;
  label: string;
  value: number | null;
  achieved_at: string;
};

/** Streak-length thresholds that earn a milestone. */
const STREAK_THRESHOLDS = [7, 30, 100, 365];

/**
 * Detect newly-earned milestones and insert them into patient_milestones.
 * Idempotent: we never insert a (kind, label) pair the patient already has,
 * and the table also carries a unique index on (patient_id, kind, label) so a
 * race can't duplicate. Returns the milestones that were *newly* inserted.
 *
 * Runs via the patient's RLS client; practice_id auto-fills (default) in tenant
 * envs and is left null in the current pre-tenant schema.
 */
export async function checkMilestones(
  client: SupabaseServer,
  patientId: string,
  tz: string = DEFAULT_TZ,
): Promise<MilestoneRow[]> {
  const streak = await computeStreak(client, patientId, tz);

  // What does the patient already have? (kind+label is the idempotency key.)
  const { data: existingRows } = await client
    .from("patient_milestones")
    .select("kind, label")
    .eq("patient_id", patientId);
  const existing = new Set(
    ((existingRows ?? []) as { kind: string; label: string }[]).map(
      (r) => `${r.kind}::${r.label}`,
    ),
  );

  const candidates: { kind: string; label: string; value: number | null }[] = [];

  // "First log" — earned the moment there is any logging activity at all.
  if (streak.totalDays > 0) {
    candidates.push({ kind: "first_log", label: "First log", value: 1 });
  }

  // Streak thresholds — earned once the LONGEST streak crosses each bar (so a
  // lapse doesn't strip an already-earned badge).
  for (const days of STREAK_THRESHOLDS) {
    if (streak.longest >= days) {
      candidates.push({
        kind: "streak",
        label: `${days}-day streak`,
        value: days,
      });
    }
  }

  const toInsert = candidates.filter(
    (c) => !existing.has(`${c.kind}::${c.label}`),
  );
  if (toInsert.length === 0) return [];

  const { data: inserted } = await client
    .from("patient_milestones")
    .insert(
      toInsert.map((c) => ({
        patient_id: patientId,
        kind: c.kind,
        label: c.label,
        value: c.value,
      })),
    )
    .select("kind, label, value, achieved_at");

  return (inserted ?? []) as MilestoneRow[];
}
