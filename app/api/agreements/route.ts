import { createClient } from "@/lib/supabase/server";
import { getCurrentPatient } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { AGREEMENT_TEMPLATES } from "@/lib/agreements/templates";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const patient = await getCurrentPatient();
  if (!patient)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const key = String(body.key ?? "");
  const title = String(body.title ?? "");
  const signature = body.signature;

  // `key` must be a known template type (also satisfies the agreements.type
  // CHECK constraint: recording|ai_use|privacy|consent).
  const tpl = AGREEMENT_TEMPLATES.find((t) => t.key === key);
  if (!tpl)
    return NextResponse.json({ error: "unknown agreement" }, { status: 400 });

  // Signature must be a bounded PNG data URL — reject anything else to prevent
  // oversized or non-image payloads.
  if (
    typeof signature !== "string" ||
    signature.length > 200000 ||
    !signature.startsWith("data:image/png;base64,")
  )
    return NextResponse.json(
      { error: "Invalid signature: expected a PNG data URL under 200KB." },
      { status: 400 },
    );

  const supabase = await createClient();

  const fwd = request.headers.get("x-forwarded-for");
  const signedIp = fwd ? fwd.split(",")[0].trim() : null;

  const patch = {
    document_ref: title || tpl.title,
    signature_ref: signature,
    signed_at: new Date().toISOString(),
    signed_ip: signedIp,
  };

  // No unique (patient_id, type) constraint exists, so upsert manually.
  const { data: existing } = await supabase
    .from("agreements")
    .select("id")
    .eq("patient_id", patient.id)
    .eq("type", tpl.key)
    .maybeSingle();

  const result = existing?.id
    ? await supabase
        .from("agreements")
        .update(patch)
        .eq("id", existing.id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("agreements")
        .insert({ patient_id: patient.id, type: tpl.key, ...patch })
        .select("id")
        .maybeSingle();

  if (result.error)
    return NextResponse.json({ error: result.error.message }, { status: 500 });

  // `sign` isn't a member of the AuditAction union; an upserted signature is a
  // create/update of the agreements record, so use a valid action ("create").
  await logAudit({
    action: "create",
    resource: "agreements",
    resourceId: result.data?.id ?? existing?.id ?? null,
    patientId: patient.id,
  });

  return NextResponse.json({ ok: true });
}
