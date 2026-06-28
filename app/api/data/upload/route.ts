import { requireStaffApi, getSessionUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getConnector } from "@/lib/connectors/registry";
import { moduleForConnector } from "@/lib/modules";
import { getEnabledModules } from "@/lib/modules/requireModule";
import { rateLimit } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const INLINE_THRESHOLD = 500 * 1024; // parse inline if < 500 KB

export async function POST(request: Request) {
  const { user } = await getSessionUser();
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimit(`data-upload:${me.id}`, 60, 3600)))
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = form.get("file") as File | null;
  const connectorId = String(form.get("connectorId") ?? "");
  const patientId = String(form.get("patientId") ?? "").trim() || null;

  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!connectorId) return NextResponse.json({ error: "Missing connectorId" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 413 });

  // Validate connector exists and is enabled.
  let connector;
  try { connector = getConnector(connectorId); } catch { return NextResponse.json({ error: `Unknown connector: ${connectorId}` }, { status: 400 }); }
  if (connector.phase === "phase2") return NextResponse.json({ error: "This connector is not yet available." }, { status: 503 });

  // Module gate: connector writes use the admin client (bypasses RLS), so enforce module ownership here.
  const owner = moduleForConnector(connectorId);
  if (owner && !(await getEnabledModules()).has(owner))
    return NextResponse.json({ error: "Module not enabled for this connector" }, { status: 403 });

  // Batch importers (targetTable === "patients") have no single patient context.
  const isBatchImport = connector.targetTable === "patients";
  if (!patientId && !isBatchImport) return NextResponse.json({ error: "Missing patientId" }, { status: 400 });

  const admin = createAdminClient();
  const { data: pc } = await admin.from("practice_connectors").select("enabled").eq("connector_id", connectorId).maybeSingle();
  if (pc && !pc.enabled) return NextResponse.json({ error: "This connector is disabled for this practice." }, { status: 403 });

  // MIME validation.
  const mimeOk = connector.accepts.some((a) => file.type.startsWith(a) || a === file.type);
  if (!mimeOk) return NextResponse.json({ error: `Connector "${connector.label}" does not accept ${file.type}. Accepted: ${connector.accepts.join(", ")}` }, { status: 415 });

  // Verify staff can access the patient — skipped for batch imports which create patients.
  const supabase = await createClient();
  let patient: { id: string; first_name: string; last_name: string; dob?: string | null; sex?: string | null } | null = null;
  if (patientId && !isBatchImport) {
    const { data } = await supabase.from("patients").select("id, first_name, last_name, dob, sex").eq("id", patientId).is("deleted_at", null).maybeSingle();
    if (!data) return NextResponse.json({ error: "Patient not found or access denied" }, { status: 404 });
    patient = data;
  }

  // Upload raw file to Supabase Storage.
  const ext = file.name.split(".").pop() ?? "bin";
  const importId = crypto.randomUUID();
  const storagePath = patientId
    ? `patients/${patientId}/imports/${importId}.${ext}`
    : `batch-imports/${importId}.${ext}`;
  const arrayBuf = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuf);

  const { error: uploadError } = await admin.storage.from("patient-files").upload(storagePath, fileBuffer, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });

  // Create import job.
  const { error: insertError } = await admin.from("health_data_imports").insert({
    id: importId,
    patient_id: patientId,
    connector_id: connectorId,
    raw_storage_ref: storagePath,
    raw_mime: file.type,
    raw_file_name: file.name,
    file_size_bytes: file.size,
    status: "pending_parse",
    target_table: connector.targetTable,
    uploaded_by: user.id,
  });
  if (insertError) {
    // Clean up the already-uploaded file so it doesn't sit orphaned in storage.
    await admin.storage.from("patient-files").remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Parse inline for small files.
  if (fileBuffer.length < INLINE_THRESHOLD) {
    await parseImport({ importId, fileBuffer, mimeType: file.type, originalFileName: file.name, patient: patient ?? { id: "", firstName: "", lastName: "" }, connectorId, admin });
  }

  const { data: job } = await admin.from("health_data_imports").select("status, parsed_data, parse_error").eq("id", importId).single();
  return NextResponse.json({ importId, status: job?.status ?? "pending_parse" });
}

async function parseImport(opts: {
  importId: string; fileBuffer: Buffer; mimeType: string; originalFileName: string;
  patient: { id: string; firstName?: string; lastName?: string; first_name?: string; last_name?: string; dob?: string | null; sex?: string | null };
  connectorId: string; admin: ReturnType<typeof createAdminClient>;
}) {
  const { importId, fileBuffer, mimeType, originalFileName, patient, connectorId, admin } = opts;
  await admin.from("health_data_imports").update({ status: "parsing" }).eq("id", importId);
  try {
    const { data: pc } = await admin.from("practice_connectors").select("config_json").eq("connector_id", connectorId).maybeSingle();
    const connector = getConnector(connectorId);
    const result = await connector.parse({
      fileBuffer, mimeType, originalFileName,
      patient: { id: patient.id, firstName: patient.firstName ?? patient.first_name ?? "", lastName: patient.lastName ?? patient.last_name ?? "", dob: patient.dob ?? undefined, sex: patient.sex ?? undefined },
      connectorConfig: (pc?.config_json as Record<string, unknown>) ?? {},
    });
    await admin.from("health_data_imports").update({
      status: "pending_review",
      parsed_data: { rows: result.rows, summary: result.summary, warnings: result.warnings, rawText: result.rawText?.slice(0, 2000) },
      parsed_at: new Date().toISOString(),
    }).eq("id", importId);
  } catch (err) {
    await admin.from("health_data_imports").update({
      status: "failed",
      parse_error: err instanceof Error ? err.message : String(err),
    }).eq("id", importId);
  }
}
