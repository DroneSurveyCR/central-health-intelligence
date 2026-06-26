import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

type IncomingFinding = {
  region_code?: string;
  system?: string;
  severity?: string;
  finding_text?: string;
};

export async function POST(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const patient_id = String(body.patientId || "");
  if (!patient_id)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  const scan_type = body.scan_type ? String(body.scan_type) : "bioresonance";
  const scan_date = body.scan_date ? String(body.scan_date) : null;
  const raw_pdf_ref = body.raw_pdf_ref ? String(body.raw_pdf_ref) : null;

  const supabase = await createClient();

  // RLS ensures staff may only create scans for their own patients.
  const { data: scan, error } = await supabase
    .from("scans")
    .insert({
      patient_id,
      scan_type,
      scan_date,
      raw_pdf_ref,
      parse_status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error || !scan)
    return NextResponse.json(
      { error: error?.message ?? "could not create scan" },
      { status: 400 },
    );

  // Optionally attach body-map findings.
  if (Array.isArray(body.findings) && body.findings.length > 0) {
    const rows = (body.findings as IncomingFinding[])
      .filter((f) => f && f.region_code)
      .map((f) => ({
        scan_id: scan.id,
        region_code: String(f.region_code),
        system: f.system ? String(f.system) : null,
        severity: ["mild", "moderate", "high"].includes(String(f.severity))
          ? String(f.severity)
          : null,
        finding_text: f.finding_text ? String(f.finding_text) : null,
      }));
    if (rows.length > 0) {
      const { error: fErr } = await supabase
        .from("body_map_findings")
        .insert(rows);
      if (fErr)
        return NextResponse.json({ error: fErr.message }, { status: 400 });
    }
  }

  await logAudit({
    action: "create",
    resource: "scans",
    resourceId: scan.id,
    patientId: patient_id,
  });

  return NextResponse.json({ ok: true, id: scan.id });
}
