import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const p = gate.practitioner;

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const medication = String(body.medication || "").trim();

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!medication)
    return NextResponse.json({ error: "missing medication" }, { status: 400 });

  const dose =
    typeof body.dose === "string" && body.dose.trim() ? body.dose.trim() : null;
  const sig =
    typeof body.sig === "string" && body.sig.trim() ? body.sig.trim() : null;
  const quantity =
    typeof body.quantity === "string" && body.quantity.trim()
      ? body.quantity.trim()
      : null;
  const pharmacyName =
    typeof body.pharmacy_name === "string" && body.pharmacy_name.trim()
      ? body.pharmacy_name.trim()
      : null;
  const refills =
    body.refills != null && Number.isFinite(Number(body.refills))
      ? Number(body.refills)
      : 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .insert({
      patient_id: patientId,
      prescriber_id: p.id,
      medication,
      dose,
      sig,
      quantity,
      refills,
      pharmacy_name: pharmacyName,
      status: "draft",
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "prescriptions",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}

export async function PATCH(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const p = gate.practitioner;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .update({ status: "signed", signed_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, patient_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "update",
    resource: "prescriptions",
    resourceId: id,
    patientId: data?.patient_id ?? null,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
