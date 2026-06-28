import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { hasModule } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

/** Parse a numeric field that may be null/empty; returns null when absent. */
function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  // requireStaff equivalent for an API route.
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  // Module gate (the real gate; RLS is defense-in-depth).
  if (!(await hasModule("weight")))
    return NextResponse.json({ error: "module not enabled" }, { status: 403 });

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  const weightKg = Number(body.weight_kg);
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg >= 500)
    return NextResponse.json(
      { error: "weight_kg must be greater than 0 and less than 500" },
      { status: 400 },
    );

  const bodyFatPct = parseOptionalNumber(body.body_fat_pct);
  if (bodyFatPct != null && (bodyFatPct < 0 || bodyFatPct > 70))
    return NextResponse.json(
      { error: "body_fat_pct must be between 0 and 70" },
      { status: 400 },
    );

  const muscleMassKg = parseOptionalNumber(body.muscle_mass_kg);

  const measuredOn =
    typeof body.measured_on === "string" && body.measured_on
      ? body.measured_on
      : new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  // RLS enforces this practitioner can_access_patient + tenant scope on insert.
  const { data, error } = await supabase
    .from("body_composition")
    .insert({
      patient_id: patientId,
      measured_on: measuredOn,
      weight_kg: weightKg,
      body_fat_pct: bodyFatPct,
      muscle_mass_kg: muscleMassKg,
      device_model: "manual",
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "body_composition",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
