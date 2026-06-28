import { createClient } from "@/lib/supabase/server";
import { getCurrentPatient, getCurrentPractitioner, staffMfaGate } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const MAX_LEN = 4000;

/**
 * POST /api/message
 *
 * Patient session  → inserts a message with sender 'patient' for their own thread.
 * Staff session     → inserts a message with sender 'staff' + practitioner_id for the
 *                      posted patientId.
 *
 * RLS enforces that the patient can only write their own thread and that staff can
 * only write threads for patients they have access to. This handler does input
 * validation and routing; the database is the source of truth for authorization.
 */
export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const body = String(payload?.body ?? "").trim();

  if (!body)
    return NextResponse.json({ error: "missing body" }, { status: 400 });
  if (body.length > MAX_LEN)
    return NextResponse.json({ error: "message too long" }, { status: 400 });

  const supabase = await createClient();

  // Patient path: a patient session always writes to their own thread as 'patient'.
  const patient = await getCurrentPatient();
  if (patient) {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        patient_id: patient.id,
        sender: "patient",
        body,
      })
      .select("id")
      .maybeSingle();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: data?.id });
  }

  // Staff path: reply into a specific patient's thread as 'staff'.
  const practitioner = await getCurrentPractitioner();
  if (practitioner) {
    const mfa = await staffMfaGate();
    if (mfa) return mfa;
    const patientId = String(payload?.patientId ?? "");
    if (!patientId)
      return NextResponse.json({ error: "missing patientId" }, { status: 400 });

    const { data, error } = await supabase
      .from("messages")
      .insert({
        patient_id: patientId,
        sender: "staff",
        practitioner_id: practitioner.id,
        body,
      })
      .select("id")
      .maybeSingle();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    await logAudit({
      action: "create",
      resource: "messages",
      resourceId: data?.id ?? null,
      patientId,
    });

    return NextResponse.json({ ok: true, id: data?.id });
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
