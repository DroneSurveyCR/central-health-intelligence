import { createClient } from "@/lib/supabase/server";
import { getCurrentPatient } from "@/lib/auth/roles";
import { normalizeSex } from "@/lib/intake/normalize";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const patient = await getCurrentPatient();
  if (!patient)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const formData = (body.form_data ?? {}) as Record<string, unknown>;
  const currentStep = Number(body.current_step ?? 0);
  const completed = Boolean(body.completed);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("intake_forms")
    .select("id")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    form_data: formData,
    current_step: currentStep,
    completed,
  };
  if (completed) patch.submitted_at = new Date().toISOString();

  if (existing?.id) {
    await supabase.from("intake_forms").update(patch).eq("id", existing.id);
  } else {
    await supabase
      .from("intake_forms")
      .insert({ patient_id: patient.id, ...patch });
  }

  // Keep the patient's name/sex in sync from their intake answers.
  const namePatch: Record<string, unknown> = {};
  if (typeof formData.first_name === "string") namePatch.first_name = formData.first_name;
  if (typeof formData.last_name === "string") namePatch.last_name = formData.last_name;
  if (typeof formData.sex === "string") namePatch.sex = normalizeSex(formData.sex);
  if (completed) namePatch.status_cached = "existing";
  if (Object.keys(namePatch).length)
    await supabase.from("patients").update(namePatch).eq("id", patient.id);

  return NextResponse.json({ ok: true });
}
