import { requireStaffApi } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

// Flexible Tytron thermal-scan drop. Stores the raw file (PDF/CSV/image) against a
// spine assessment and records the storage ref. No parser yet — that comes once we
// have a sample export. The raw upload + reference is deliberately format-agnostic.

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: Request) {
  await requireModule("chiro");
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;

  if (!(await rateLimit(`spine-thermal:${me.id}`, 30, 3600)))
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = form.get("file") as File | null;
  const assessmentId = String(form.get("assessmentId") ?? "").trim();
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!assessmentId) return NextResponse.json({ error: "Missing assessmentId" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 413 });

  // Format-agnostic but not a free-for-all: docs, sheets, text and images.
  const t = file.type || "";
  const okMime = /pdf|csv|image\/|text\/|spreadsheet|octet-stream/.test(t) || t === "";
  if (!okMime) return NextResponse.json({ error: `Unsupported file type: ${t}` }, { status: 415 });

  // RLS: confirm the assessment is in the caller's tenant and get its patient.
  const supabase = await createClient();
  const { data: asmt } = await supabase
    .from("spine_assessments")
    .select("id, patient_id")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!asmt) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  // Store the raw file (service-role, same bucket as the connector uploads).
  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 8);
  const storagePath = `patients/${asmt.patient_id}/thermal/${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from("patient-files")
    .upload(storagePath, buf, { contentType: t || "application/octet-stream", upsert: false });
  if (upErr) return NextResponse.json({ error: `Storage upload failed: ${upErr.message}` }, { status: 500 });

  // Record the ref on the assessment through the RLS client (tenant-confined).
  const { error: updErr } = await supabase
    .from("spine_assessments")
    .update({ thermal_ref: storagePath, updated_at: new Date().toISOString() })
    .eq("id", assessmentId);
  if (updErr) {
    await admin.storage.from("patient-files").remove([storagePath]);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await logAudit({ action: "update", resource: "spine_assessments", resourceId: assessmentId, patientId: asmt.patient_id });
  return NextResponse.json({ ok: true, thermal_ref: storagePath, name: file.name });
}
