import { getCurrentPatient } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Patient right to deletion — soft-delete now + a tracked request (hard-delete after retention). */
export async function POST() {
  const patient = await getCurrentPatient();
  if (!patient)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  await supabase.from("data_requests").insert({
    patient_id: patient.id,
    kind: "deletion",
  });
  await supabase
    .from("patients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", patient.id);
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
