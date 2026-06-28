import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
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

/**
 * Compute the rate-corrected QT interval (QTc) using Bazett's formula.
 *
 *   RR (sec) = 60 / HR(bpm)
 *   QTc (ms) = QT(ms) / sqrt(RR)
 *
 * Comparing a RAW QT against a QTc threshold is clinically invalid: QT shortens
 * as heart rate rises, so an unsafe QTc can hide behind a normal-looking raw QT
 * (and vice-versa). We therefore require BOTH a QT and a heart rate to derive a
 * usable QTc. Returns null when either input is missing or non-physiologic — the
 * caller treats a null QTc as "no usable ECG" (fail-safe: cannot clear ibogaine).
 *
 * Bazett is the most widely used correction but over-corrects at high rates;
 * the exact correction method is clinician-confirmable (see CLINICAL-REVIEW).
 */
function bazettQtcMs(qtMs: number | null, hrBpm: number | null): number | null {
  if (qtMs == null || !Number.isFinite(qtMs) || qtMs <= 0) return null;
  // Physiologic HR guard: reject 0/negative/absurd values that would corrupt RR.
  if (hrBpm == null || !Number.isFinite(hrBpm) || hrBpm <= 0 || hrBpm > 300)
    return null;
  const rrSec = 60 / hrBpm;
  const qtc = qtMs / Math.sqrt(rrSec);
  return Number.isFinite(qtc) ? qtc : null;
}

/**
 * Normalize a free-text sex value to "male" | "female" | null.
 * Used to pick the sex-specific QTc threshold; unknown defaults to the stricter.
 */
function normalizeSex(v: unknown): "male" | "female" | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (s.startsWith("m")) return "male";
  if (s.startsWith("f")) return "female";
  return null;
}

export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

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
  const ecgHrBpm = parseOptionalNumber(body.ecg_hr_bpm);
  const currentMedications =
    typeof body.current_medications === "string" &&
    body.current_medications.trim()
      ? body.current_medications.trim()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;

  const supabase = await createClient();

  // Fetch patient sex to select the correct QTc threshold. Failure / missing sex
  // is non-fatal: we fall back to the STRICTER (female) threshold below.
  const { data: patientRow } = await supabase
    .from("patients")
    .select("sex")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();
  const sex = normalizeSex(patientRow?.sex);

  // Compute screening_result server-side (authoritative). [CLINICAL-REVIEW K2/K3]
  // NOTE: the QTc CORRECTION METHOD (Bazett) and the exact thresholds, plus the
  // FULL contraindication/interaction lists, remain clinician-confirmable
  // (CLINICAL-REVIEW K1, K4–K6).
  //
  // QTc gate (ibogaine): the prior code compared the RAW QT (ecg_qt_ms) against a
  // QTc threshold, which is clinically invalid. We now compute the rate-corrected
  // QTc (Bazett) from QT + heart rate and gate on that.
  //
  //   QTc(ms) = QT(ms) / sqrt(60 / HR)
  //
  // Sex-specific thresholds (clinician-confirmable):
  //   - prolonged / contraindicated:  QTc > 450 ms (male) | > 470 ms (female)
  //   - HARD contraindication:         QTc >= 500 ms (either sex)
  //   - unknown sex -> default to the stricter 470 ms threshold.
  //
  // Fail-safe: ibogaine requires a USABLE ECG-derived QTc (needs BOTH QT and HR).
  // If we cannot compute QTc, ibogaine cannot be cleared (treated as absolute).
  const ecgQtcMs =
    substance === "ibogaine" ? bazettQtcMs(ecgQtMs, ecgHrBpm) : null;
  const ibogaineEcgMissing = substance === "ibogaine" && ecgQtcMs == null;

  // Stricter (470) when sex is unknown; 450 for males.
  const qtcProlongedThreshold = sex === "male" ? 450 : 470;
  const QTC_HARD_THRESHOLD = 500; // absolute, sex-independent.
  const ibogaineQtcProlonged =
    substance === "ibogaine" &&
    ecgQtcMs != null &&
    ecgQtcMs > qtcProlongedThreshold;
  const ibogaineQtcHard =
    substance === "ibogaine" &&
    ecgQtcMs != null &&
    ecgQtcMs >= QTC_HARD_THRESHOLD;

  const absolute =
    flags.psych_schizophrenia ||
    flags.psych_active_psychosis ||
    flags.psych_suicidal_ideation ||
    ibogaineEcgMissing ||
    ibogaineQtcProlonged ||
    ibogaineQtcHard ||
    (flags.sub_lithium && substance === "ibogaine");

  const anyFlag = Object.values(flags).some((f) => f === true);
  // Fail-safe: "cleared" is emitted ONLY on an explicit clinician completeness
  // attestation with zero flags. Any missing/incomplete data reads as "conditional"
  // (needs review), never "cleared".
  const attested = asBool(body.assessment_complete);

  let screeningResult: "cleared" | "conditional" | "contraindicated";
  if (absolute) {
    screeningResult = "contraindicated";
  } else if (anyFlag || !attested) {
    screeningResult = "conditional";
  } else {
    screeningResult = "cleared";
  }

  // Store the raw QT input (the only ECG column the schema currently has). The
  // heart rate and the computed QTc have no columns yet, so we return the QTc in
  // the API result instead of persisting it. (Add ecg_hr_bpm / ecg_qtc_ms columns
  // in a future migration to store them.)
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
    // Computed QTc (Bazett, ms, rounded) for transparency. Null when not
    // applicable (non-ibogaine) or not computable (QT or HR missing/invalid).
    ecg_qtc_ms: ecgQtcMs == null ? null : Math.round(ecgQtcMs),
  });
}
