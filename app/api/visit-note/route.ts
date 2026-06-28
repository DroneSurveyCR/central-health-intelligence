import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const VALID_TYPES = ["consult", "follow_up", "scan_review", "other"];

export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  const note = String(body.note || "").trim();
  const type = VALID_TYPES.includes(body.type) ? body.type : "other";

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!note)
    return NextResponse.json({ error: "missing note" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .insert({
      patient_id: patientId,
      practitioner_id: practitioner.id,
      visit_date: new Date().toISOString(),
      summary: note,
      modalities_json: { note_type: type },
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "visits",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
