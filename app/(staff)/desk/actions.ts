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
 * Add (or update) a practitioner on a patient's care team. Upserts on the
 * unique (patient_id, practitioner_id) pair so re-assigning just updates the
 * role / can_approve flag. Tenant-scoped via RLS + the practice_id default.
 */
export async function assignCareTeam(formData: FormData) {
  await requireStaff();
  const patientId = str(formData, "patient_id");
  const practitionerId = str(formData, "practitioner_id");
  if (!patientId || !practitionerId) return;

  const supabase = await createClient();
  await supabase.from("care_team").upsert(
    {
      patient_id: patientId,
      practitioner_id: practitionerId,
      role: str(formData, "role"),
      can_approve: formData.get("can_approve") != null,
    },
    { onConflict: "patient_id,practitioner_id" },
  );

  await logAudit({
    action: "update",
    resource: "care_team",
    patientId,
  });
  revalidatePath("/desk");
}

/** Remove a practitioner from a patient's care team. */
export async function removeCareTeam(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("care_team").delete().eq("id", id);
  await logAudit({ action: "update", resource: "care_team", resourceId: id });
  revalidatePath("/desk");
}
