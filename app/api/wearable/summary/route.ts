import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

/** Parse a numeric field that may be null/empty; returns null when absent. */
function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Like parseOptionalNumber but rounds to an integer (for integer columns). */
function parseOptionalInt(v: unknown): number | null {
  const n = parseOptionalNumber(v);
  return n === null ? null : Math.round(n);
}

export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "").trim();
  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  const date =
    typeof body.date === "string" && body.date.trim() ? body.date.trim() : "";
  if (!date)
    return NextResponse.json({ error: "missing date" }, { status: 400 });

  const connectorSlug =
    typeof body.connector_slug === "string" && body.connector_slug.trim()
      ? body.connector_slug.trim()
      : "manual";

  const record: Record<string, unknown> = {
    patient_id: patientId,
    connector_slug: connectorSlug,
    date,
    resting_hr: parseOptionalNumber(body.resting_hr),
    hrv_ms: parseOptionalNumber(body.hrv_ms),
    sleep_hours: parseOptionalNumber(body.sleep_hours),
    steps: parseOptionalInt(body.steps),
    readiness_score: parseOptionalInt(body.readiness_score),
    spo2_avg: parseOptionalNumber(body.spo2_avg),
    weight_kg: parseOptionalNumber(body.weight_kg),
    avg_glucose_mgdl: parseOptionalNumber(body.avg_glucose_mgdl),
    time_in_range_pct: parseOptionalNumber(body.time_in_range_pct),
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wearable_daily_summaries")
    .upsert(record, { onConflict: "patient_id,connector_slug,date" })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "wearable_daily_summaries",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
