import { requireStaffApi } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

// Generalized spine-scan import: attach any device scan to a spine assessment.
// One flexible path covers the top low-hanging-fruit devices — Tytron (thermal),
// PostureScreen (posture), digital X-ray (DICOM), MyoVision (sEMG), CLA INSiGHT
// (CoreScore). Raw file is stored + typed; automated parsing comes later per device.

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB (DICOM can be large)
const VALID_TYPES = new Set(["thermal", "xray", "semg", "posture", "corescore", "other"]);

export async function POST(request: Request) {
  await requireModule("chiro");
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;

  if (!(await rateLimit(`spine-scan:${me.id}`, 40, 3600)))
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = form.get("file") as File | null;
  const assessmentId = String(form.get("assessmentId") ?? "").trim();
  const scanType = String(form.get("scanType") ?? "other").trim().toLowerCase();
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!assessmentId) return NextResponse.json({ error: "Missing assessmentId" }, { status: 400 });
  if (!VALID_TYPES.has(scanType)) return NextResponse.json({ error: "Invalid scan type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 30 MB)" }, { status: 413 });

  const t = file.type || "";
  const okMime =
    /pdf|csv|image\/|text\/|dicom|octet-stream|spreadsheet/.test(t) || t === "" || file.name.toLowerCase().endsWith(".dcm");
  if (!okMime) return NextResponse.json({ error: `Unsupported file type: ${t}` }, { status: 415 });

  // RLS: confirm the assessment is in the caller's tenant + read current scans.
  const supabase = await createClient();
  const { data: asmt } = await supabase
    .from("spine_assessments")
    .select("id, patient_id, scan_files")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!asmt) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 8);
  const storagePath = `patients/${asmt.patient_id}/spine-scans/${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from("patient-files")
    .upload(storagePath, buf, { contentType: t || "application/octet-stream", upsert: false });
  if (upErr) return NextResponse.json({ error: `Storage upload failed: ${upErr.message}` }, { status: 500 });

  const existing = Array.isArray(asmt.scan_files) ? (asmt.scan_files as unknown[]) : [];
  const entry = { type: scanType, ref: storagePath, name: file.name, uploaded_at: new Date().toISOString() };
  const { error: updErr } = await supabase
    .from("spine_assessments")
    .update({ scan_files: [...existing, entry], updated_at: new Date().toISOString() })
    .eq("id", assessmentId);
  if (updErr) {
    await admin.storage.from("patient-files").remove([storagePath]);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await logAudit({ action: "update", resource: "spine_assessments", resourceId: assessmentId, patientId: asmt.patient_id });
  return NextResponse.json({ ok: true, scan: entry });
}
