import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const MAX_LEN = 40;

/** Normalize a label: trim, collapse whitespace, cap length. */
function cleanLabel(v: unknown): string {
  return String(v ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_LEN);
}

/** POST — add a label to a patient. Body: { patientId, label }. */
export async function POST(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  const label = cleanLabel(body.label);

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!label)
    return NextResponse.json({ error: "missing label" }, { status: 400 });

  const supabase = await createClient();
  // RLS (labels_staff = can_access_patient) enforces access on insert.
  const { data, error } = await supabase
    .from("patient_labels")
    .insert({ patient_id: patientId, label })
    .select("id, label")
    .maybeSingle();

  // Treat a unique-violation (duplicate label) as a no-op success.
  if (error && error.code !== "23505")
    return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "patient_labels",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id, label });
}

/** DELETE — remove a label. Query: ?patientId=...&label=... */
export async function DELETE(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const patientId = String(searchParams.get("patientId") || "");
  const label = cleanLabel(searchParams.get("label"));

  if (!patientId || !label)
    return NextResponse.json({ error: "missing patientId or label" }, { status: 400 });

  const supabase = await createClient();
  // RLS enforces access on delete.
  const { error } = await supabase
    .from("patient_labels")
    .delete()
    .eq("patient_id", patientId)
    .eq("label", label);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "delete",
    resource: "patient_labels",
    resourceId: null,
    patientId,
  });

  return NextResponse.json({ ok: true });
}
