import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The kinds of AI-generated content that flow through the approval queue. */
export type DraftKind =
  | "visit_note"
  | "scan_synthesis"
  | "protocol_change"
  | "titration"
  | "wearable_narrative"
  | "message_reply"
  | "superbill"
  | "briefing_points";

/** Human-readable labels for each draft kind. */
export const KIND_LABELS: Record<DraftKind, string> = {
  visit_note: "Visit Note",
  scan_synthesis: "Scan Synthesis",
  protocol_change: "Protocol Change",
  titration: "Titration",
  wearable_narrative: "Wearable Narrative",
  message_reply: "Message Reply",
  superbill: "Superbill",
  briefing_points: "Briefing Points",
};

/**
 * Enqueue an AI draft for human approval. Inserts a `pending` ai_drafts row and
 * returns its id, or null on error. This is the entry point other modules call
 * to route AI output through the doctor-approval gate.
 */
export async function createDraft(opts: {
  patientId: string;
  kind: DraftKind;
  draftContent: string;
  model?: string;
  sourceRef?: unknown;
  targetTable?: string;
  targetId?: string;
}): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_drafts")
    .insert({
      patient_id: opts.patientId,
      kind: opts.kind,
      status: "pending",
      draft_content: opts.draftContent,
      model: opts.model ?? null,
      source_ref: opts.sourceRef ?? null,
      target_table: opts.targetTable ?? null,
      target_id: opts.targetId ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) return null;
  return data.id as string;
}

/** A pending ai_drafts row with the patient's name joined for display. */
export type PendingDraft = {
  id: string;
  kind: string;
  status: string;
  model: string | null;
  draft_content: string | null;
  edited_content: string | null;
  created_at: string | null;
  patient_id: string;
  patients: { first_name: string; last_name: string } | null;
};

/**
 * Load the pending approval queue for the caller's practice. RLS
 * (can_access_patient) scopes this to drafts the caller may review. Pass the
 * already-created client so callers can audit/reuse the same connection.
 */
export async function listPendingDrafts(
  client: SupabaseClient,
): Promise<PendingDraft[]> {
  const { data } = await client
    .from("ai_drafts")
    .select(
      "id, kind, status, model, draft_content, edited_content, created_at, patient_id, patients(first_name, last_name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  // The patients join comes back as an object or a 1-element array depending on
  // the relationship inference — normalize to a single object.
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const pt = Array.isArray(r.patients) ? r.patients[0] : r.patients;
    return { ...r, patients: (pt as PendingDraft["patients"]) ?? null } as PendingDraft;
  });
}

/**
 * Finalize a draft. Approval is the ONLY action that finalizes clinical AI
 * output; it stamps approved_content (the edited text if present, else the
 * original draft) and the reviewer. Writing approved content into target tables
 * is intentionally left to callers. Returns true on success.
 */
export async function reviewDraft(
  client: SupabaseClient,
  id: string,
  decision: "approved" | "rejected",
  reviewerId: string,
): Promise<boolean> {
  const now = new Date().toISOString();

  if (decision === "rejected") {
    const { error } = await client
      .from("ai_drafts")
      .update({ status: "rejected", reviewed_by: reviewerId, reviewed_at: now })
      .eq("id", id)
      .eq("status", "pending");
    return !error;
  }

  // approve: resolve the content to freeze (edited if the reviewer edited it).
  const { data: draft } = await client
    .from("ai_drafts")
    .select("draft_content, edited_content")
    .eq("id", id)
    .maybeSingle();
  const approvedContent =
    (draft?.edited_content as string | null) ??
    (draft?.draft_content as string | null) ??
    null;

  const { error } = await client
    .from("ai_drafts")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: now,
      approved_content: approvedContent,
    })
    .eq("id", id)
    .eq("status", "pending");
  return !error;
}
