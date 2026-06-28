import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";
import type { PlanLevel } from "@/lib/plan/helpers";

const LEVELS: PlanLevel[] = ["supplement", "modality", "habit", "measurement"];
const STATUSES = ["draft", "active", "completed"] as const;

export async function POST(request: Request) {
  // Only staff may write plans.
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const action = String(body.action || "");
  const supabase = await createClient();

  // ---- add_item: insert a plan_item, creating an active plan if needed ----
  if (action === "add_item") {
    const patientId = String(body.patient_id || "");
    const name = String(body.name || "").trim();
    const level = body.level as string;

    if (!patientId)
      return NextResponse.json({ error: "missing patient_id" }, { status: 400 });
    if (!name)
      return NextResponse.json({ error: "missing name" }, { status: 400 });
    if (!LEVELS.includes(level as PlanLevel))
      return NextResponse.json({ error: "invalid level" }, { status: 400 });

    const detail = body.detail ? String(body.detail).slice(0, 500) : null;
    const dose = body.dose ? String(body.dose).slice(0, 200) : null;
    let phaseId = body.phase_id ? String(body.phase_id) : null;

    // Find an existing active (or latest) plan for this patient; RLS confines
    // the result to the practitioner's own patients.
    const { data: existingPlan, error: planErr } = await supabase
      .from("plans")
      .select("id, status")
      .eq("patient_id", patientId)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (planErr)
      return NextResponse.json({ error: planErr.message }, { status: 400 });

    let planId = existingPlan?.id ?? null;

    // No plan yet — create an active one owned by this practitioner.
    if (!planId) {
      const today = new Date();
      const start = today.toISOString().slice(0, 10);
      const end = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const { data: created, error: createErr } = await supabase
        .from("plans")
        .insert({
          patient_id: patientId,
          practitioner_id: me.id,
          title: "90-Day Reset",
          start_date: start,
          end_date: end,
          status: "active",
        })
        .select("id")
        .maybeSingle();
      if (createErr || !created)
        return NextResponse.json(
          { error: createErr?.message ?? "could not create plan" },
          { status: 400 },
        );
      planId = created.id;
      phaseId = null; // a brand-new plan has no phases to attach to
    }

    // Guard: a supplied phase must belong to this plan.
    if (phaseId) {
      const { data: phase } = await supabase
        .from("plan_phases")
        .select("id")
        .eq("id", phaseId)
        .eq("plan_id", planId)
        .maybeSingle();
      if (!phase) phaseId = null;
    }

    const { error: itemErr } = await supabase.from("plan_items").insert({
      plan_id: planId,
      phase_id: phaseId,
      level,
      name: name.slice(0, 200),
      detail,
      dose,
    });
    if (itemErr)
      return NextResponse.json({ error: itemErr.message }, { status: 400 });

    await logAudit({
      action: "update",
      resource: "plans",
      resourceId: planId,
      patientId,
    });

    return NextResponse.json({ ok: true, plan_id: planId });
  }

  // ---- set_status: update a plan's status ----
  if (action === "set_status") {
    const planId = String(body.plan_id || "");
    const status = String(body.status || "");
    if (!planId)
      return NextResponse.json({ error: "missing plan_id" }, { status: 400 });
    if (!STATUSES.includes(status as (typeof STATUSES)[number]))
      return NextResponse.json({ error: "invalid status" }, { status: 400 });

    const { data: updated, error } = await supabase
      .from("plans")
      .update({ status })
      .eq("id", planId)
      .select("patient_id")
      .maybeSingle();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    await logAudit({
      action: "update",
      resource: "plans",
      resourceId: planId,
      patientId: updated?.patient_id ?? null,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
