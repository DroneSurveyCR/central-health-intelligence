"use server";

// HealthSync Cloud — /today ENGAGEMENT server actions.
// Protocol-aware quick-log (dose taken / how-I-feel tags) + milestone check.
// Everything runs as the logged-in patient through the RLS client, writing to
// the EXISTING logging table `progress_logs` (no new logging columns invented).
//
// `progress_logs.kind` is constrained to ('vital','how_i_feel','adherence',
// 'measurement') — we use 'adherence' for a dose-taken event and 'how_i_feel'
// for a quick mood tag, mirroring the existing /api/log shapes.

import { createClient } from "@/lib/supabase/server";
import { getCurrentPatient } from "@/lib/auth/roles";
import { getEnabledModules } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import { checkMilestones } from "@/lib/engagement/streaks";
import { revalidatePath } from "next/cache";

const FEELING_TAGS = [
  "energized",
  "calm",
  "focused",
  "tired",
  "anxious",
  "sore",
  "nauseous",
  "great",
] as const;

export type QuickLogResult = {
  ok: boolean;
  error?: string;
  /** Newly-earned milestone labels, if any (for a celebratory toast). */
  newMilestones?: string[];
};

/**
 * Resolve the patient + their active plan id once. Returns null if not signed
 * in. Audited as a PHI read because it touches the patient/plan records.
 */
async function loadContext() {
  const me = await getCurrentPatient();
  if (!me) return null;
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("patient_id", me.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { me, supabase, planId: (plan?.id as string | undefined) ?? null };
}

/**
 * Protocol-aware quick-log. Writes ONE `progress_logs` row of kind 'adherence'
 * recording a dose-taken event (+ optional how-I-feel tags), linked to the
 * patient's active plan. Then runs the milestone check so a streak threshold
 * crossed by this very log is awarded immediately.
 *
 * Gated: only meaningful when the `engagement` module is on. If the practice
 * also runs `peptide`, we tag the entry as a peptide dose for richer reporting.
 */
export async function logProtocolDose(input: {
  taken: boolean;
  tags?: string[];
  note?: string;
}): Promise<QuickLogResult> {
  const modules = await getEnabledModules();
  if (!modules.has("engagement")) {
    return { ok: false, error: "Engagement is not enabled for this practice." };
  }

  const ctx = await loadContext();
  if (!ctx) return { ok: false, error: "Not signed in" };
  const { me, supabase, planId } = ctx;

  const tags = Array.isArray(input.tags)
    ? input.tags.filter((t): t is string => FEELING_TAGS.includes(t as never))
    : [];
  const note =
    typeof input.note === "string" && input.note.trim()
      ? input.note.trim().slice(0, 1000)
      : null;

  // value_json is the existing flexible payload column on progress_logs.
  const value_json: Record<string, unknown> = {
    type: "protocol_dose",
    taken: !!input.taken,
    tags,
    note,
    // If peptide module is on, mark the source vertical so staff reporting can
    // distinguish a peptide dose from a generic plan dose. Pure metadata — we do
    // NOT write to the (module-gated, possibly-absent) peptide tables here.
    vertical: modules.has("peptide") ? "peptide" : "plan",
  };

  const { error } = await supabase.from("progress_logs").insert({
    patient_id: me.id,
    plan_id: planId,
    kind: "adherence",
    value_json,
    source: "client_app",
  });
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "create", resource: "progress_logs", patientId: me.id });

  // Award any milestone this log just unlocked (idempotent).
  let newMilestones: string[] = [];
  try {
    const earned = await checkMilestones(supabase, me.id);
    newMilestones = earned.map((m) => m.label);
  } catch {
    // Never fail the log because the milestone pass hiccuped.
  }

  revalidatePath("/today");
  return { ok: true, newMilestones };
}

/**
 * Quick "how I feel" tag log (no 1-10 score needed) — a low-friction daily
 * touch that also keeps the streak alive. Writes kind 'how_i_feel'.
 */
export async function logFeelingTags(input: {
  tags: string[];
  note?: string;
}): Promise<QuickLogResult> {
  const modules = await getEnabledModules();
  if (!modules.has("engagement")) {
    return { ok: false, error: "Engagement is not enabled for this practice." };
  }

  const ctx = await loadContext();
  if (!ctx) return { ok: false, error: "Not signed in" };
  const { me, supabase, planId } = ctx;

  const tags = (Array.isArray(input.tags) ? input.tags : []).filter(
    (t): t is string => FEELING_TAGS.includes(t as never),
  );
  if (tags.length === 0) return { ok: false, error: "Pick at least one tag." };
  const note =
    typeof input.note === "string" && input.note.trim()
      ? input.note.trim().slice(0, 1000)
      : null;

  const { error } = await supabase.from("progress_logs").insert({
    patient_id: me.id,
    plan_id: planId,
    kind: "how_i_feel",
    value_json: { type: "feeling_tags", tags, note },
    source: "client_app",
  });
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "create", resource: "progress_logs", patientId: me.id });

  let newMilestones: string[] = [];
  try {
    const earned = await checkMilestones(supabase, me.id);
    newMilestones = earned.map((m) => m.label);
  } catch {
    /* swallow — milestone failure must not break the log */
  }

  revalidatePath("/today");
  return { ok: true, newMilestones };
}

export { FEELING_TAGS };
