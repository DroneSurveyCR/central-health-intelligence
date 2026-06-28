import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { hasModule } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

/** Coerce an incoming value into a clean string[] (or empty array). */
function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => String(s).trim()).filter((s) => s.length > 0);
}

/**
 * Create a modality_recommendation for a patient and, when a session count is
 * given, an accompanying modality_courses row to track progress.
 * Tenant scoping is enforced by RLS + the dynamic practice_id default on insert,
 * so we never set practice_id explicitly here.
 */
export async function POST(request: Request) {
  // Same gates the page enforces: staff + MFA step-up + marketplace module.
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const p = gate.practitioner;
  if (!(await hasModule("marketplace")))
    return NextResponse.json({ error: "marketplace module not enabled" }, { status: 403 });

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const modalityId = String(body.modality_id || "");

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!modalityId)
    return NextResponse.json({ error: "missing modality_id" }, { status: 400 });

  const rationale =
    typeof body.rationale === "string" && body.rationale.trim()
      ? body.rationale.trim()
      : null;
  const targetMarkers = toStringArray(body.target_markers);
  const windowRaw = Number(body.measurement_window_days);
  const measurementWindowDays =
    Number.isFinite(windowRaw) && windowRaw > 0 ? Math.round(windowRaw) : 90;
  const sessionsRaw = Number(body.sessions_total);
  const sessionsTotal =
    Number.isFinite(sessionsRaw) && sessionsRaw > 0
      ? Math.round(sessionsRaw)
      : null;
  const nextSessionAt =
    typeof body.next_session_at === "string" && body.next_session_at
      ? body.next_session_at
      : null;

  const supabase = await createClient();

  // Verify the patient and modality are visible to this practice (RLS) before referencing
  // them — RLS checks the NEW row's practice_id on insert, not the FKs it points at, so an
  // unscoped recommend could otherwise reference a foreign patient or another clinic's modality.
  const [{ data: ptRow }, { data: modRow }] = await Promise.all([
    supabase.from("patients").select("id").eq("id", patientId).is("deleted_at", null).maybeSingle(),
    supabase.from("modalities").select("id").eq("id", modalityId).maybeSingle(),
  ]);
  if (!ptRow) return NextResponse.json({ error: "patient not found" }, { status: 404 });
  if (!modRow) return NextResponse.json({ error: "modality not found" }, { status: 404 });

  const { data: rec, error } = await supabase
    .from("modality_recommendations")
    .insert({
      patient_id: patientId,
      modality_id: modalityId,
      recommended_by: p.id,
      rationale,
      target_markers: targetMarkers,
      measurement_window_days: measurementWindowDays,
      status: "recommended",
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let courseId: string | null = null;
  if (sessionsTotal) {
    const { data: course, error: cErr } = await supabase
      .from("modality_courses")
      .insert({
        recommendation_id: rec?.id,
        patient_id: patientId,
        sessions_total: sessionsTotal,
        sessions_done: 0,
        next_session_at: nextSessionAt,
        status: "active",
      })
      .select("id")
      .maybeSingle();
    // A course is optional bookkeeping; don't fail the whole recommendation on it.
    if (!cErr) courseId = course?.id ?? null;
  }

  await logAudit({
    action: "create",
    resource: "modality_recommendations",
    resourceId: rec?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: rec?.id, courseId });
}
