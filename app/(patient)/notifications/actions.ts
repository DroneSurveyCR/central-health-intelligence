"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentPatient } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";

// Patient notification actions run with the RLS session client (createClient),
// so every write is automatically scoped to the caller's practice. We ADDITIONALLY
// pin each update to recipient_patient_id = me.id so a patient can only ever mark
// their OWN notifications read — never a practice-wide or another patient's row.

function id(fd: FormData, k = "id"): string {
  return String(fd.get(k) ?? "").trim();
}

/** Mark a single notification read (only if it's addressed to me and unread). */
export async function markRead(fd: FormData) {
  const me = await getCurrentPatient();
  if (!me) return;
  const notifId = id(fd);
  if (!notifId) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notifId)
    .eq("recipient_patient_id", me.id)
    .is("read_at", null);
  revalidatePath("/notifications");
}

/** Mark every unread notification addressed to me read. */
export async function markAllRead() {
  const me = await getCurrentPatient();
  if (!me) return;
  const supabase = await createClient();
  // RLS scopes to the practice; we additionally constrain to my own rows so this
  // never touches practice-wide or other patients' notifications.
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_patient_id", me.id)
    .is("read_at", null);
  revalidatePath("/notifications");
}
