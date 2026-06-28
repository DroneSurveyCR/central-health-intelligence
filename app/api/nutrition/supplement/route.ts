import { createClient } from "@/lib/supabase/server";
import {
  getCurrentPractitioner,
  getCurrentPatient,
  staffMfaGate,
} from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Dual-auth: staff (provides patientId) OR patient (forced to own id).
  const practitioner = await getCurrentPractitioner();
  const patient = practitioner ? null : await getCurrentPatient();
  if (!practitioner && !patient)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (practitioner) {
    const mfa = await staffMfaGate();
    if (mfa) return mfa;
  }

  const body = await request.json().catch(() => ({}));

  const patientId = patient ? patient.id : String(body.patientId || "");
  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  const supplementName = String(body.supplement_name || "").trim();
  if (!supplementName)
    return NextResponse.json(
      { error: "missing supplement_name" },
      { status: 400 },
    );

  const loggedAt =
    typeof body.logged_at === "string" && body.logged_at
      ? body.logged_at
      : new Date().toISOString();
  const dose =
    typeof body.dose === "string" && body.dose.trim() ? body.dose.trim() : null;
  const timing =
    typeof body.timing === "string" && body.timing.trim()
      ? body.timing.trim()
      : null;
  const brand =
    typeof body.brand === "string" && body.brand.trim()
      ? body.brand.trim()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supplement_logs")
    .insert({
      patient_id: patientId,
      logged_at: loggedAt,
      supplement_name: supplementName,
      dose,
      timing,
      brand,
      notes,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "supplement_logs",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
