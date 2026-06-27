"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";

// Notification actions run with the RLS session client (createClient), so every
// write is automatically scoped to the caller's practice — no explicit
// practice_id, and a caller can only mark their own practice's rows read.

function id(fd: FormData, k = "id"): string {
  return String(fd.get(k) ?? "").trim();
}

/** Mark a single notification read. */
export async function markRead(fd: FormData) {
  await requireStaff();
  const notifId = id(fd);
  if (!notifId) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notifId)
    .is("read_at", null);
  revalidatePath("/notifications");
}

/** Mark every unread notification in the practice read. */
export async function markAllRead() {
  await requireStaff();
  const supabase = await createClient();
  // RLS already scopes to the caller's practice; just target the unread rows.
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  revalidatePath("/notifications");
}
