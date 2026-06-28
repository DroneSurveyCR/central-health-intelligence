import { getCurrentPatient, requireStaffApi } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
// (type-only import — used solely for the helper's parameter annotation)

export const dynamic = "force-dynamic";

/**
 * GDPR Art. 20 / right-of-access — complete structured export of a patient's
 * data as a downloadable JSON bundle.
 *
 *  - Patient logged in            → exports THEIR OWN data.
 *  - Staff logged in + ?patientId → exports that patient (RLS enforces that the
 *    staff member may only ever read patients in their own practice).
 *
 * SECURITY: this route uses the session client (createClient) on purpose — never
 * the service-role/admin client. RLS guarantees the requester only ever receives
 * rows they are already allowed to see, so neither a patient nor a staff member
 * can pull another practice's / another patient's data through this endpoint.
 */

const SCHEMA_VERSION = "1.0";

/** Run a query, returning [] on any failure / missing table rather than throwing. */
async function safe<T>(
  fn: () => PromiseLike<{ data: T | null; error: unknown } | { data: T | null }>,
): Promise<T | []> {
  try {
    const res = await fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((res as any).error) return [] as unknown as T;
    return (res.data ?? ([] as unknown as T)) as T;
  } catch {
    // Table absent in this deployment, or any other error — skip gracefully.
    return [] as unknown as T;
  }
}

/** Select all rows of `table` for a patient by patient_id. */
function byPatient(supabase: SupabaseClient, table: string, patientId: string) {
  return () => supabase.from(table).select("*").eq("patient_id", patientId);
}

export async function GET(req: NextRequest) {
  // Patient exports their own data; otherwise require staff WITH the MFA step-up (this is a
  // full-PHI bundle, so a passwords-only API call must not bypass the org's MFA policy).
  const patientRow = await getCurrentPatient();
  let staff: { id: string } | null = null;
  if (!patientRow) {
    const gate = await requireStaffApi();
    if (!gate.ok) return gate.response;
    staff = gate.practitioner;
  }

  const supabase = await createClient();

  // Resolve which patient we are exporting.
  let patientId: string | null = patientRow?.id ?? null;
  if (!patientId) {
    // Staff path — a patientId query param is required.
    patientId = req.nextUrl.searchParams.get("patientId");
    if (!patientId) {
      return NextResponse.json(
        { error: "patientId query parameter is required for staff exports" },
        { status: 400 },
      );
    }
  }

  // Load the patient profile via RLS. If staff lacks access (different practice)
  // or the id is wrong, this comes back null and we 404 rather than leak.
  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .maybeSingle();

  if (!patient) {
    return NextResponse.json({ error: "patient not found" }, { status: 404 });
  }

  // ---- Parent records (have patient_id) -----------------------------------
  const [
    intake_forms,
    visits,
    lab_results,
    appointments,
    invoices,
    payments,
    messages,
    agreements,
    scans,
    body_composition,
    orders,
    patient_insurance,
    files,
    health_data_imports,
    plans,
    progress_logs,
    data_requests,
  ] = await Promise.all([
    safe(byPatient(supabase, "intake_forms", patientId)),
    safe(byPatient(supabase, "visits", patientId)),
    safe(byPatient(supabase, "lab_results", patientId)),
    safe(byPatient(supabase, "appointments", patientId)),
    safe(byPatient(supabase, "invoices", patientId)),
    safe(byPatient(supabase, "payments", patientId)),
    safe(byPatient(supabase, "messages", patientId)),
    safe(byPatient(supabase, "agreements", patientId)),
    safe(byPatient(supabase, "scans", patientId)),
    safe(byPatient(supabase, "body_composition", patientId)),
    safe(byPatient(supabase, "orders", patientId)),
    safe(byPatient(supabase, "patient_insurance", patientId)),
    safe(byPatient(supabase, "files", patientId)),
    safe(byPatient(supabase, "health_data_imports", patientId)),
    safe<{ id: string }[]>(byPatient(supabase, "plans", patientId)),
    safe(byPatient(supabase, "progress_logs", patientId)),
    safe(byPatient(supabase, "data_requests", patientId)),
  ]);

  // ---- Child records (no patient_id — joined through parents) --------------
  const planIds = (plans as { id: string }[]).map((p) => p.id);
  const invoiceIds = (invoices as { id: string }[]).map((i) => i.id);
  const scanIds = (scans as { id: string }[]).map((s) => s.id);

  const [plan_phases, plan_items, plan_completions, invoice_items, body_map_findings] =
    await Promise.all([
      safe(() =>
        planIds.length
          ? supabase.from("plan_phases").select("*").in("plan_id", planIds)
          : Promise.resolve({ data: [] }),
      ),
      safe(() =>
        planIds.length
          ? supabase.from("plan_items").select("*").in("plan_id", planIds)
          : Promise.resolve({ data: [] }),
      ),
      // plan_completions DOES carry patient_id — fetch directly.
      safe(byPatient(supabase, "plan_completions", patientId)),
      safe(() =>
        invoiceIds.length
          ? supabase.from("invoice_items").select("*").in("invoice_id", invoiceIds)
          : Promise.resolve({ data: [] }),
      ),
      safe(() =>
        scanIds.length
          ? supabase.from("body_map_findings").select("*").in("scan_id", scanIds)
          : Promise.resolve({ data: [] }),
      ),
    ]);

  // ---- Cloud module records (wearables + verticals + engagement + marketplace) --
  // safe() returns [] for any table absent in this deployment.
  const [
    wearable_daily_summaries,
    peptide_protocols,
    peptide_administrations,
    psychedelic_screenings,
    psychedelic_sessions,
    psychedelic_integration_notes,
    biomarker_panels,
    biological_age_scores,
    prescriptions,
    food_logs,
    supplement_logs,
    patient_milestones,
    patient_data_consents,
    modality_recommendations,
    modality_outcomes,
    modality_courses,
  ] = await Promise.all([
    safe(byPatient(supabase, "wearable_daily_summaries", patientId)),
    safe(byPatient(supabase, "peptide_protocols", patientId)),
    safe(byPatient(supabase, "peptide_administrations", patientId)),
    safe(byPatient(supabase, "psychedelic_screenings", patientId)),
    safe(byPatient(supabase, "psychedelic_sessions", patientId)),
    safe(byPatient(supabase, "psychedelic_integration_notes", patientId)),
    safe(byPatient(supabase, "biomarker_panels", patientId)),
    safe(byPatient(supabase, "biological_age_scores", patientId)),
    safe(byPatient(supabase, "prescriptions", patientId)),
    safe(byPatient(supabase, "food_logs", patientId)),
    safe(byPatient(supabase, "supplement_logs", patientId)),
    safe(byPatient(supabase, "patient_milestones", patientId)),
    safe(byPatient(supabase, "patient_data_consents", patientId)),
    safe(byPatient(supabase, "modality_recommendations", patientId)),
    safe(byPatient(supabase, "modality_outcomes", patientId)),
    safe(byPatient(supabase, "modality_courses", patientId)),
  ]);

  // ---- Audit the export (PHI access) --------------------------------------
  await logAudit({
    action: "export",
    resource: "patients",
    resourceId: patientId,
    patientId,
  });

  const records = {
    intake_forms,
    visits,
    lab_results,
    scans,
    body_map_findings,
    body_composition,
    plans,
    plan_phases,
    plan_items,
    plan_completions,
    progress_logs,
    appointments,
    invoices,
    invoice_items,
    payments,
    orders,
    messages,
    agreements,
    patient_insurance,
    files,
    health_data_imports,
    data_requests,
    wearable_daily_summaries,
    peptide_protocols,
    peptide_administrations,
    psychedelic_screenings,
    psychedelic_sessions,
    psychedelic_integration_notes,
    biomarker_panels,
    biological_age_scores,
    prescriptions,
    food_logs,
    supplement_logs,
    patient_milestones,
    patient_data_consents,
    modality_recommendations,
    modality_outcomes,
    modality_courses,
  };

  const bundle = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    exported_by: staff ? { kind: "staff", id: staff.id } : { kind: "patient", id: patientId },
    patient,
    record_counts: Object.fromEntries(
      Object.entries(records).map(([k, v]) => [k, Array.isArray(v) ? v.length : v ? 1 : 0]),
    ),
    records,
  };

  // Build a friendly filename: healthsync-export-<patient>-<date>.json
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = patient as any;
  const namePart =
    [p.first_name, p.last_name].filter(Boolean).join("-") || String(patientId).slice(0, 8);
  const safeName = namePart.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");
  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `healthsync-export-${safeName || "patient"}-${datePart}.json`;

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
