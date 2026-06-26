import { createClient } from "@/lib/supabase/server";

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
