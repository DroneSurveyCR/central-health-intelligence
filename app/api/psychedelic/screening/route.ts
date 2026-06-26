import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

/** Coerce a possibly-missing field to a boolean. */
function asBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

/** Parse a numeric field that may be null/empty; returns null when absent. */
function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const substance = String(body.substance || "").trim().toLowerCase();
  const screeningDate =
    typeof body.screening_date === "string" && body.screening_date
      ? body.screening_date
      : new Date().toISOString().slice(0, 10);

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!substance)
    return NextResponse.json({ error: "missing substance" }, { status: 400 });

  const flags = {
    cv_hypertension: asBool(body.cv_hypertension),
    cv_arrhythmia: asBool(body.cv_arrhythmia),
    psych_schizophrenia: asBool(body.psych_schizophrenia),
    psych_bipolar_i: asBool(body.psych_bipolar_i),
    psych_active_psychosis: asBool(body.psych_active_psychosis),
    psych_suicidal_ideation: asBool(body.psych_suicidal_ideation),
    sub_benzodiazepine: asBool(body.sub_benzodiazepine),
    sub_lithium: asBool(body.sub_lithium),
    sub_maoi: asBool(body.sub_maoi),
    sub_ssri: asBool(body.sub_ssri),
    ibo_qt_prolongation: asBool(body.ibo_qt_prolongation),
    ibo_liver_disease: asBool(body.ibo_liver_disease),
    med_seizure_history: asBool(body.med_seizure_history),
    med_pregnancy: asBool(body.med_pregnancy),
  };

  const ecgQtMs = parseOptionalNumber(body.ecg_qt_ms);
  const currentMedications =
    typeof body.current_medications === "string" &&
    body.current_medications.trim()
      ? body.current_medications.trim()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;

  // Compute screening_result server-side (authoritative).
  const absolute =
    flags.psych_schizophrenia ||
    flags.psych_active_psychosis ||
    flags.psych_suicidal_ideation ||
    (substance === "ibogaine" && ecgQtMs != null && ecgQtMs > 450) ||
    (flags.sub_lithium && substance === "ibogaine");

  let screeningResult: "cleared" | "conditional" | "contraindicated";
  if (absolute) {
    screeningResult = "contraindicated";
  } else if (Object.values(flags).some((f) => f === true)) {
    screeningResult = "conditional";
  } else {
    screeningResult = "cleared";
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("psychedelic_screenings")
    .insert({
      patient_id: patientId,
      screened_by: practitioner.id,
      substance,
      screening_date: screeningDate,
      ...flags,
      current_medications: currentMedications,
      ecg_qt_ms: ecgQtMs,
      screening_result: screeningResult,
      notes,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "psychedelic_screenings",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({
    ok: true,
    id: data?.id,
    screening_result: screeningResult,
  });
}
