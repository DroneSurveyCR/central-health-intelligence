"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";

function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const s = v == null ? "" : String(v).trim();
  return s || null;
}

/**
 * Add a task to the front-desk worklist. Tenant-scoped via RLS + the
 * practice_id default (current_practice_id()). patient_id, assignee_id and
 * due_at are all optional. created_by is the logged-in practitioner.
 */
export async function addTask(formData: FormData) {
  const me = await requireStaff();
  const title = str(formData, "title");
  if (!title) return; // a task needs a title

  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .insert({
      title,
      detail: str(formData, "detail"),
      patient_id: str(formData, "patient_id"),
      assignee_id: str(formData, "assignee_id"),
      due_at: str(formData, "due_at"),
      status: "open",
      created_by: me.id,
    })
    .select("id")
    .maybeSingle();

  await logAudit({
    action: "create",
    resource: "tasks",
    resourceId: data?.id ?? null,
    patientId: str(formData, "patient_id"),
  });
  revalidatePath("/desk");
}

/** Mark a task done. */
export async function completeTask(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("tasks").update({ status: "done" }).eq("id", id);
  await logAudit({ action: "update", resource: "tasks", resourceId: id });
  revalidatePath("/desk");
}

/** Reopen a completed task. */
export async function reopenTask(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("tasks").update({ status: "open" }).eq("id", id);
  await logAudit({ action: "update", resource: "tasks", resourceId: id });
  revalidatePath("/desk");
}
