import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const VALID_STATUS = ["active", "paused", "completed", "discontinued"];

export async function POST(request: Request) {
  const p = await getCurrentPractitioner();
  if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const compound = String(body.compound || "").trim();
  const startDate =
    typeof body.start_date === "string" && body.start_date
      ? body.start_date
      : new Date().toISOString().slice(0, 10);
  const currentDose = Number(body.current_dose_mg);

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!compound)
    return NextResponse.json({ error: "missing compound" }, { status: 400 });
  if (body.current_dose_mg == null || !Number.isFinite(currentDose))
    return NextResponse.json(
      { error: "invalid current_dose_mg" },
      { status: 400 },
    );

  const category =
    typeof body.category === "string" && body.category.trim()
      ? body.category.trim()
      : null;
  const route =
    typeof body.route === "string" && body.route.trim()
      ? body.route.trim()
      : null;
  const goal =
    typeof body.goal === "string" && body.goal.trim() ? body.goal.trim() : null;
  const pharmacyName =
    typeof body.pharmacy_name === "string" && body.pharmacy_name.trim()
      ? body.pharmacy_name.trim()
      : null;
  const titration = Array.isArray(body.titration_schedule)
    ? body.titration_schedule
    : [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("peptide_protocols")
    .insert({
      patient_id: patientId,
      prescriber_id: p.id,
      compound,
      category,
      route,
      start_date: startDate,
      goal,
      current_dose_mg: currentDose,
      titration_schedule: titration,
      pharmacy_name: pharmacyName,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "peptide_protocols",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}

export async function PATCH(request: Request) {
  const p = await getCurrentPractitioner();
  if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.current_week != null && Number.isFinite(Number(body.current_week)))
    patch.current_week = Number(body.current_week);
  if (
    body.current_dose_mg != null &&
    Number.isFinite(Number(body.current_dose_mg))
  )
    patch.current_dose_mg = Number(body.current_dose_mg);
  if (typeof body.status === "string" && VALID_STATUS.includes(body.status))
    patch.status = body.status;

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("peptide_protocols")
    .update(patch)
    .eq("id", id)
    .select("id, patient_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "update",
    resource: "peptide_protocols",
    resourceId: id,
    patientId: data?.patient_id ?? null,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
