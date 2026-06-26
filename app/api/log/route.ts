import { createClient } from "@/lib/supabase/server";
import { getCurrentPatient } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const patient = await getCurrentPatient();
  if (!patient)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const supabase = await createClient();

  if (action === "toggle_completion") {
    const planItemId = String(body.plan_item_id ?? "");
    const date = String(body.date ?? "");
    const completed = Boolean(body.completed);
    if (!planItemId || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return NextResponse.json({ error: "missing plan_item_id or date" }, { status: 400 });

    // Verify the item belongs to one of this patient's plans (RLS scopes the join).
    const { data: item } = await supabase
      .from("plan_items")
      .select("id, plan:plans!inner(patient_id)")
      .eq("id", planItemId)
      .maybeSingle();

    const plan = (item as { plan?: { patient_id?: string } | { patient_id?: string }[] } | null)?.plan;
    const planPatientId = Array.isArray(plan) ? plan[0]?.patient_id : plan?.patient_id;
    if (!item || planPatientId !== patient.id)
      return NextResponse.json({ error: "not found" }, { status: 404 });

    // Upsert by (plan_item_id, patient_id, date) — no DB unique constraint, so do it manually.
    const { data: existing } = await supabase
      .from("plan_completions")
      .select("id")
      .eq("plan_item_id", planItemId)
      .eq("patient_id", patient.id)
      .eq("date", date)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("plan_completions")
        .update({ completed })
        .eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const { error } = await supabase.from("plan_completions").insert({
        plan_item_id: planItemId,
        patient_id: patient.id,
        date,
        completed,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logAudit({
      action: "create",
      resource: "progress_logs",
      patientId: patient.id,
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "log_feeling") {
    const score = Number(body.score);
    if (!Number.isInteger(score) || score < 1 || score > 10)
      return NextResponse.json({ error: "score must be 1-10" }, { status: 400 });
    const note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim().slice(0, 1000)
        : null;

    const { error } = await supabase.from("progress_logs").insert({
      patient_id: patient.id,
      kind: "how_i_feel",
      value_json: { score, note },
      source: "client_app",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logAudit({
      action: "create",
      resource: "progress_logs",
      patientId: patient.id,
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "log_vital") {
    const systolic = Number(body.systolic);
    const diastolic = Number(body.diastolic);
    if (
      !Number.isFinite(systolic) ||
      !Number.isFinite(diastolic) ||
      systolic <= 0 ||
      diastolic <= 0 ||
      systolic > 350 ||
      diastolic > 250
    )
      return NextResponse.json({ error: "invalid blood pressure" }, { status: 400 });

    const { error } = await supabase.from("progress_logs").insert({
      patient_id: patient.id,
      kind: "vital",
      value_json: { type: "blood_pressure", systolic, diastolic },
      source: "client_app",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logAudit({
      action: "create",
      resource: "progress_logs",
      patientId: patient.id,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
