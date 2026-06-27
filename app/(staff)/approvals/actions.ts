"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { reviewDraft } from "@/lib/ai/drafts";

/**
 * Approve a pending AI draft. Approval is the ONLY action that finalizes
 * clinical AI output (freezes approved_content). Tenant-scoped via RLS; the
 * reviewer is the logged-in practitioner.
 */
export async function approveDraft(formData: FormData) {
  const me = await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const ok = await reviewDraft(supabase, id, "approved", me.id);
  if (ok) {
    await logAudit({
      action: "update",
      resource: "ai_drafts",
      resourceId: id,
    });
  }
  revalidatePath("/approvals");
}

/** Reject a pending AI draft (no clinical data is written). */
export async function rejectDraft(formData: FormData) {
  const me = await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const ok = await reviewDraft(supabase, id, "rejected", me.id);
  if (ok) {
    await logAudit({
      action: "update",
      resource: "ai_drafts",
      resourceId: id,
    });
  }
  revalidatePath("/approvals");
}
