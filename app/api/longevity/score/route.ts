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

/** Parse an optional integer field; returns null when absent/invalid. */
function parseOptionalInt(v: unknown): number | null {
  const n = parseOptionalNumber(v);
  return n == null ? null : Math.trunc(n);
}

export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  const biologicalAge = parseOptionalNumber(body.biological_age);
  if (biologicalAge == null)
    return NextResponse.json(
      { error: "missing biological_age" },
      { status: 400 },
    );

  const chronologicalAge = parseOptionalInt(body.chronological_age);
  if (chronologicalAge == null)
    return NextResponse.json(
      { error: "missing chronological_age" },
      { status: 400 },
    );

  const scoreDate =
    typeof body.score_date === "string" && body.score_date
      ? body.score_date
      : new Date().toISOString().slice(0, 10);

  const algorithm =
    typeof body.algorithm === "string" && body.algorithm.trim()
      ? body.algorithm.trim()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;
  const markerInputs =
    body.marker_inputs != null && typeof body.marker_inputs === "object"
      ? body.marker_inputs
      : null;

  const delta = Math.round((biologicalAge - chronologicalAge) * 10) / 10;

  const supabase = await createClient();
  // RLS enforces that this practitioner can_access_patient for the insert.
  const { data, error } = await supabase
    .from("biological_age_scores")
    .insert({
      patient_id: patientId,
      score_date: scoreDate,
      biological_age: biologicalAge,
      chronological_age: chronologicalAge,
      delta,
      algorithm,
      marker_inputs: markerInputs,
      notes,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "biological_age_scores",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id, delta });
}
