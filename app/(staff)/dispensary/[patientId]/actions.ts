"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff, getCurrentPractitioner } from "@/lib/auth/roles";
import { hasModule } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import { revalidatePath } from "next/cache";

export async function recommendSupplement(fd: FormData) {
  await requireStaff();
  if (!(await hasModule("dispensary"))) return;

  const patientId = String(fd.get("patientId") ?? "").trim();
  const productId = String(fd.get("product_id") ?? "").trim();
  const dosageNote = String(fd.get("dosage_note") ?? "").trim() || null;
  if (!patientId || !productId) return;

  const supabase = await createClient();
  const me = await getCurrentPractitioner();

  // Resolve the product name from the catalog (RLS-scoped to this practice).
  const { data: product } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return;

  // RLS enforces tenant scope + can_access_patient on insert.
  const { data, error } = await supabase
    .from("supplement_recommendations")
    .insert({
      patient_id: patientId,
      product_id: product.id,
      product_name: product.name,
      dosage_note: dosageNote,
      recommended_by: me?.id ?? null,
    })
    .select("id")
    .maybeSingle();

  if (!error) {
    await logAudit({
      action: "create",
      resource: "supplement_recommendations",
      resourceId: data?.id ?? null,
      patientId,
    });
  }

  revalidatePath(`/dispensary/${patientId}`);
}
