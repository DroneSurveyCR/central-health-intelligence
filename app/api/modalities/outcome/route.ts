import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const VALID_DIRECTION = ["up", "down", "flat"];
const VALID_VERDICT = ["improved", "no_change", "worsened", "inconclusive"];

/** Parse a numeric field that may be null/empty; returns null when absent. */
function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Record one observational outcome reading for a marker tied to a recommendation.
 * This is a PERSONAL RESPONSE record — never an efficacy claim. The clinician
 * supplies the verdict; we just compute delta when baseline/after are numeric.
 */
export async function POST(request: Request) {
  const p = await getCurrentPractitioner();
  if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const recommendationId = String(body.recommendation_id || "");
  const marker = String(body.marker || "").trim();

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!recommendationId)
    return NextResponse.json(
      { error: "missing recommendation_id" },
      { status: 400 },
    );
  if (!marker)
    return NextResponse.json({ error: "missing marker" }, { status: 400 });

  const baseline = parseOptionalNumber(body.baseline);
  const during = parseOptionalNumber(body.during);
  const after = parseOptionalNumber(body.after);

  // delta: explicit value wins; otherwise derive from baseline -> after when both numeric.
  let delta = parseOptionalNumber(body.delta);
  if (delta == null && baseline != null && after != null) delta = after - baseline;

  const direction =
    typeof body.direction === "string" && VALID_DIRECTION.includes(body.direction)
      ? body.direction
      : delta == null
        ? null
        : delta > 0
          ? "up"
          : delta < 0
            ? "down"
            : "flat";

  const verdict =
    typeof body.verdict === "string" && VALID_VERDICT.includes(body.verdict)
      ? body.verdict
      : "inconclusive";

  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modality_outcomes")
    .insert({
      recommendation_id: recommendationId,
      patient_id: patientId,
      marker,
      baseline,
      during,
      after,
      delta,
      direction,
      verdict,
      interpreted_by: p.id,
      notes,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "modality_outcomes",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
