import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { parseWearableCsv } from "@/lib/wearables/parse-csv";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  const patientId = String(form.get("patientId") || "").trim();
  const connectorSlug =
    String(form.get("connectorSlug") || "").trim() || "manual_csv";

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!file || typeof file.text !== "function")
    return NextResponse.json({ error: "missing file" }, { status: 400 });

  let rows: Record<string, unknown>[];
  try {
    const text = await file.text();
    rows = parseWearableCsv(text, connectorSlug, patientId);
  } catch {
    return NextResponse.json({ error: "could not parse csv" }, { status: 400 });
  }

  if (rows.length === 0)
    return NextResponse.json(
      { error: "no valid rows found in csv" },
      { status: 400 },
    );

  const supabase = await createClient();
  // RLS enforces can_access_patient on insert/update.
  const { error } = await supabase
    .from("wearable_daily_summaries")
    .upsert(rows, { onConflict: "patient_id,connector_slug,date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "wearable_daily_summaries",
    resourceId: `import:${connectorSlug}:${rows.length} rows`,
    patientId,
  });

  return NextResponse.json({ ok: true, imported: rows.length });
}
