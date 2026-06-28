import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const SESSION_TYPES = ["preparation", "journey", "integration", "followup"];

/** Parse a numeric field that may be null/empty; returns null when absent. */
function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Trim a string field; returns null when absent/empty. */
function asOptionalText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function POST(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const sessionType = String(body.session_type || "").trim();
  const sessionDate =
    typeof body.session_date === "string" && body.session_date
      ? body.session_date
      : new Date().toISOString().slice(0, 10);

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!SESSION_TYPES.includes(sessionType))
    return NextResponse.json(
      { error: "invalid session_type" },
      { status: 400 },
    );

  const supabase = await createClient();

  // [CLINICAL-REVIEW K7] A "journey" (dosing) session must be backed by a current,
  // non-contraindicated screening for that substance. Fail-safe: block when the
  // screening is missing or contraindicated, unless the clinician supplies an
  // explicit override_reason (which is recorded in the notes).
  let overrideNote: string | null = null;
  if (sessionType === "journey") {
    const substanceVal = asOptionalText(body.substance)?.toLowerCase() ?? null;
    const overrideReason = asOptionalText(body.override_reason);
    let screen: { screening_result?: string; screening_date?: string } | null = null;
    if (substanceVal) {
      const { data: s } = await supabase
        .from("psychedelic_screenings")
        .select("screening_result, substance, screening_date")
        .eq("patient_id", patientId)
        .eq("substance", substanceVal)
        .order("screening_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      screen = s;
    }
    // [CLINICAL-REVIEW K7] Only an explicitly CLEARED screening (zero flags + clinician
    // completeness attestation) green-lights a journey without an override. A 'conditional'
    // screening (flagged, or not yet attested) and a 'contraindicated' one BOTH require an
    // explicit override_reason — treating 'conditional' as cleared was a fail-open.
    // The screening must also be recent; a stale screen no longer reflects the patient.
    const SCREENING_MAX_AGE_DAYS = 90; // clinician-confirmable recency window
    const screeningFresh =
      !!screen?.screening_date &&
      (Date.now() - new Date(screen.screening_date).getTime()) / 86_400_000 <= SCREENING_MAX_AGE_DAYS;
    const cleared = !!screen && screen.screening_result === "cleared" && screeningFresh;
    if (!cleared && !overrideReason)
      return NextResponse.json(
        {
          error:
            "A current, non-contraindicated screening for this substance is required before logging a journey session. Supply override_reason to proceed.",
          requiresOverride: true,
        },
        { status: 409 },
      );
    if (!cleared && overrideReason)
      overrideNote = `[CLINICAL OVERRIDE — no cleared screening] ${overrideReason}`;
  }

  const { data, error } = await supabase
    .from("psychedelic_sessions")
    .insert({
      patient_id: patientId,
      practitioner_id: practitioner.id,
      screening_id: asOptionalText(body.screening_id),
      session_type: sessionType,
      session_date: sessionDate,
      substance: asOptionalText(body.substance),
      compound: asOptionalText(body.compound),
      route: asOptionalText(body.route),
      dose_mg: parseOptionalNumber(body.dose_mg),
      patient_weight_kg: parseOptionalNumber(body.patient_weight_kg),
      intention_statement: asOptionalText(body.intention_statement),
      setting_location: asOptionalText(body.setting_location),
      practitioner_notes:
        [asOptionalText(body.practitioner_notes), overrideNote].filter(Boolean).join("\n\n") || null,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "psychedelic_sessions",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
