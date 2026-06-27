import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import { isDoseSafe, maxDoseFor, doseUnitFor } from "@/lib/hrt/templates";
import { NextResponse } from "next/server";

const VALID_STATUS = ["active", "paused", "completed", "discontinued"];

export async function POST(request: Request) {
  await requireModule("hrt");
  const p = await getCurrentPractitioner();
  if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const hormone = String(body.hormone || "").trim();
  const startDate =
    typeof body.start_date === "string" && body.start_date
      ? body.start_date
      : new Date().toISOString().slice(0, 10);
  const currentDose = Number(body.current_dose);

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!hormone)
    return NextResponse.json({ error: "missing hormone" }, { status: 400 });
  // [CLINICAL-REVIEW P1/P2] dose must be finite, positive and within the
  // per-hormone ceiling (GUARD, not clinical truth — a clinician must confirm).
  if (body.current_dose == null || !isDoseSafe(currentDose, hormone))
    return NextResponse.json(
      {
        error: `current_dose must be > 0 and ≤ ${maxDoseFor(hormone)} for ${hormone}`,
      },
      { status: 400 },
    );

  const route =
    typeof body.route === "string" && body.route.trim()
      ? body.route.trim()
      : null;
  const doseUnit =
    typeof body.dose_unit === "string" && body.dose_unit.trim()
      ? body.dose_unit.trim()
      : doseUnitFor(hormone);
  const frequency =
    typeof body.frequency === "string" && body.frequency.trim()
      ? body.frequency.trim()
      : null;
  const goal =
    typeof body.goal === "string" && body.goal.trim() ? body.goal.trim() : null;
  const titration = Array.isArray(body.titration_schedule)
    ? body.titration_schedule
    : [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hrt_protocols")
    .insert({
      patient_id: patientId,
      prescriber_id: p.id,
      hormone,
      route,
      current_dose: currentDose,
      dose_unit: doseUnit,
      frequency,
      titration_schedule: titration,
      start_date: startDate,
      goal,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "hrt_protocols",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}

export async function PATCH(request: Request) {
  await requireModule("hrt");
  const p = await getCurrentPractitioner();
  if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = await createClient();

  const patch: Record<string, unknown> = {};
  if (body.current_week != null && Number.isFinite(Number(body.current_week)))
    patch.current_week = Number(body.current_week);
  if (typeof body.status === "string" && VALID_STATUS.includes(body.status))
    patch.status = body.status;

  // [CLINICAL-REVIEW P1/P2] never auto-advance dose: a dose change requires an
  // explicit value and must pass the per-hormone ceiling + positivity guard.
  if (body.current_dose != null) {
    const newDose = Number(body.current_dose);
    const { data: proto } = await supabase
      .from("hrt_protocols")
      .select("hormone")
      .eq("id", id)
      .maybeSingle();
    if (!isDoseSafe(newDose, proto?.hormone))
      return NextResponse.json(
        {
          error: `current_dose must be > 0 and ≤ ${maxDoseFor(proto?.hormone)}`,
        },
        { status: 400 },
      );
    patch.current_dose = newDose;
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("hrt_protocols")
    .update(patch)
    .eq("id", id)
    .select("id, patient_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "update",
    resource: "hrt_protocols",
    resourceId: id,
    patientId: data?.patient_id ?? null,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
