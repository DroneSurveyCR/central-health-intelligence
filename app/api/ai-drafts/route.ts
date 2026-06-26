import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const VALID_KINDS = [
  "visit_note",
  "scan_synthesis",
  "protocol_change",
  "titration",
  "wearable_narrative",
  "message_reply",
  "superbill",
  "briefing_points",
];

/** POST — enqueue an AI draft for approval. */
export async function POST(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  const kind = String(body.kind || "");
  const draftContent = String(body.draft_content || "");

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!VALID_KINDS.includes(kind))
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_drafts")
    .insert({
      patient_id: patientId,
      kind,
      status: "pending",
      draft_content: draftContent,
      model: body.model ? String(body.model) : null,
      source_ref: body.source_ref ?? null,
      target_table: body.target_table ? String(body.target_table) : null,
      target_id: body.target_id ? String(body.target_id) : null,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "ai_drafts",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}

/**
 * PATCH — review a draft. Body: { id, action: "approve"|"reject"|"edit",
 * edited_content? }. Approval is the only finalizing action; it records
 * approved_content but does not write to target tables (left to callers).
 */
export async function PATCH(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "");
  const editedContent =
    body.edited_content != null ? String(body.edited_content) : null;

  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  if (!["approve", "reject", "edit"].includes(action))
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  if (action === "edit" && editedContent === null)
    return NextResponse.json({ error: "missing edited_content" }, { status: 400 });

  const supabase = await createClient();

  // Load the existing draft (RLS enforces patient access).
  const { data: draft, error: loadErr } = await supabase
    .from("ai_drafts")
    .select("id, draft_content, edited_content")
    .eq("id", id)
    .maybeSingle();

  if (loadErr)
    return NextResponse.json({ error: loadErr.message }, { status: 400 });
  if (!draft)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const now = new Date().toISOString();
  let patch: Record<string, unknown>;

  if (action === "approve") {
    const baseContent =
      editedContent ?? (draft.edited_content as string | null) ?? (draft.draft_content as string | null);
    patch = {
      status: "approved",
      reviewed_by: practitioner.id,
      reviewed_at: now,
      approved_content: baseContent,
      ...(editedContent != null ? { edited_content: editedContent } : {}),
    };
  } else if (action === "edit") {
    patch = {
      status: "edited",
      edited_content: editedContent,
    };
  } else {
    // reject
    patch = {
      status: "rejected",
      reviewed_by: practitioner.id,
      reviewed_at: now,
    };
  }

  const { error } = await supabase
    .from("ai_drafts")
    .update(patch)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({ action: "update", resource: "ai_drafts", resourceId: id });
  return NextResponse.json({ ok: true });
}
