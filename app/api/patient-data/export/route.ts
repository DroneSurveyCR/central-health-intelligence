import { getCurrentPatient } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

/** Patient right of access — one-click export of their own data. */
export async function GET() {
  const patient = await getCurrentPatient();
  if (!patient)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const [p, intake, appts, agreements] = await Promise.all([
    supabase.from("patients").select("*").eq("id", patient.id).maybeSingle(),
    supabase.from("intake_forms").select("*").eq("patient_id", patient.id),
    supabase.from("appointments").select("*").eq("patient_id", patient.id),
    supabase.from("agreements").select("*").eq("patient_id", patient.id),
  ]);

  await logAudit({
    action: "export",
    resource: "patients",
    resourceId: patient.id,
    patientId: patient.id,
  });

  const payload = {
    exported_at: new Date().toISOString(),
    patient: p.data,
    intake_forms: intake.data,
    appointments: appts.data,
    agreements: agreements.data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="my-healthsync-data.json"',
    },
  });
}
