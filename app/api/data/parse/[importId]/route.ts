import { getCurrentPractitioner } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnector } from "@/lib/connectors/registry";
import { moduleForConnector } from "@/lib/modules";
import { getEnabledModules } from "@/lib/modules/requireModule";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ importId: string }> }) {
  const me = await getCurrentPractitioner();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { importId } = await params;
  const admin = createAdminClient();

  // Admin client bypasses RLS — scope to the caller's practice or a foreign importId leaks PHI.
  const { data: job } = await admin
    .from("health_data_imports")
    .select("*")
    .eq("id", importId)
    .eq("practice_id", me.practice_id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Import not found" }, { status: 404 });
  if (job.status === "confirmed") return NextResponse.json({ error: "Already confirmed" }, { status: 409 });

  // Module gate: parsing uses the admin client (bypasses RLS), so enforce module ownership here.
  const owner = moduleForConnector(job.connector_id);
  if (owner && !(await getEnabledModules()).has(owner))
    return NextResponse.json({ error: "Module not enabled for this connector" }, { status: 403 });

  // Download raw file.
  const { data: fileData, error: dlErr } = await admin.storage.from("patient-files").download(job.raw_storage_ref);
  if (dlErr || !fileData) return NextResponse.json({ error: `Could not download file: ${dlErr?.message}` }, { status: 500 });

  const fileBuffer = Buffer.from(await fileData.arrayBuffer());
  const { data: patient } = await admin.from("patients").select("id, first_name, last_name, dob, sex").eq("id", job.patient_id).eq("practice_id", me.practice_id).single();
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  await admin.from("health_data_imports").update({ status: "parsing", parse_error: null }).eq("id", importId);

  try {
    const { data: pc } = await admin.from("practice_connectors").select("config_json").eq("connector_id", job.connector_id).eq("practice_id", me.practice_id).maybeSingle();
    const connector = getConnector(job.connector_id);
    const result = await connector.parse({
      fileBuffer, mimeType: job.raw_mime, originalFileName: job.raw_file_name ?? "",
      patient: { id: patient.id, firstName: patient.first_name, lastName: patient.last_name, dob: patient.dob ?? undefined, sex: patient.sex ?? undefined },
      connectorConfig: (pc?.config_json as Record<string, unknown>) ?? {},
    });
    await admin.from("health_data_imports").update({
      status: "pending_review",
      parsed_data: { rows: result.rows, summary: result.summary, warnings: result.warnings, rawText: result.rawText?.slice(0, 2000) },
      parsed_at: new Date().toISOString(),
    }).eq("id", importId);
    return NextResponse.json({ importId, status: "pending_review", summary: result.summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("health_data_imports").update({ status: "failed", parse_error: msg }).eq("id", importId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
