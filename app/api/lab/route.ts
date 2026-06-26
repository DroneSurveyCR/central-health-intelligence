import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

/** Parse a numeric field that may be null/empty; returns null when absent. */
function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const marker = String(body.marker || "").trim();
  const value = Number(body.value);

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!marker)
    return NextResponse.json({ error: "missing marker" }, { status: 400 });
  if (body.value == null || body.value === "" || !Number.isFinite(value))
    return NextResponse.json({ error: "invalid value" }, { status: 400 });

  const unit =
    typeof body.unit === "string" && body.unit.trim() ? body.unit.trim() : null;
  const category =
    typeof body.category === "string" && body.category.trim()
      ? body.category.trim()
      : null;
  const optimalLow = parseOptionalNumber(body.optimal_low);
  const optimalHigh = parseOptionalNumber(body.optimal_high);

  // Accept a YYYY-MM-DD date string; default to today.
  const collectedOn =
    typeof body.collected_on === "string" && body.collected_on
      ? body.collected_on
      : new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  // RLS enforces that this practitioner can_access_patient for the insert.
  const { data, error } = await supabase
    .from("lab_results")
    .insert({
      patient_id: patientId,
      marker,
      value,
      unit,
      optimal_low: optimalLow,
      optimal_high: optimalHigh,
      category,
      collected_on: collectedOn,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "lab_results",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
