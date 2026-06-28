import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const str = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** POST — add an insurance policy. Body: { patientId, insurer, policy_number?, ... }. */
export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  const insurer = str(body.insurer);
  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!insurer)
    return NextResponse.json({ error: "missing insurer" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_insurance")
    .insert({
      patient_id: patientId,
      insurer,
      policy_number: str(body.policy_number),
      group_number: str(body.group_number),
      subscriber_name: str(body.subscriber_name),
      effective_date: str(body.effective_date),
      notes: str(body.notes),
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({ action: "create", resource: "patient_insurance", resourceId: data?.id ?? null, patientId });
  return NextResponse.json({ ok: true, id: data?.id });
}

/** DELETE — remove an insurance policy. Query: ?id=... */
export async function DELETE(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") || "");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("patient_insurance").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({ action: "delete", resource: "patient_insurance", resourceId: id });
  return NextResponse.json({ ok: true });
}
