import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { hasModule } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const VALID_EVIDENCE = ["emerging", "observational", "established"];

/** Coerce an incoming value into a clean string[]. */
function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => String(s).trim()).filter((s) => s.length > 0);
}

/**
 * Create a PRACTICE-custom modality (practice_id auto-filled by the dynamic
 * default + RLS). This adds to the clinic's own marketplace menu alongside the
 * global catalogue. Not a patient-scoped write, so no patientId in the audit.
 */
export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  if (!(await hasModule("marketplace")))
    return NextResponse.json({ error: "marketplace module not enabled" }, { status: 403 });

  const body = await request.json().catch(() => ({}));

  const name = String(body.name || "").trim();
  if (!name)
    return NextResponse.json({ error: "missing name" }, { status: 400 });

  const category =
    typeof body.category === "string" && body.category.trim()
      ? body.category.trim()
      : "other";
  const evidenceLevel =
    typeof body.evidence_level === "string" &&
    VALID_EVIDENCE.includes(body.evidence_level)
      ? body.evidence_level
      : "emerging";
  const costRaw = Number(body.typical_cost);
  const typicalCost =
    body.typical_cost != null && body.typical_cost !== "" && Number.isFinite(costRaw)
      ? costRaw
      : null;
  const typicalDuration =
    typeof body.typical_duration === "string" && body.typical_duration.trim()
      ? body.typical_duration.trim()
      : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modalities")
    .insert({
      name,
      category,
      indications: toStringArray(body.indications),
      target_markers: toStringArray(body.target_markers),
      evidence_level: evidenceLevel,
      contraindications: toStringArray(body.contraindications),
      typical_cost: typicalCost,
      typical_duration: typicalDuration,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "modalities",
    resourceId: data?.id ?? null,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
