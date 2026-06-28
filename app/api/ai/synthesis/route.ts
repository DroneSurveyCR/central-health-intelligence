import { requireStaffApi } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { generateText, aiEnabled } from "@/lib/ai";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;

  if (!aiEnabled)
    return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });

  if (!(await rateLimit(`ai-synthesis:${me.id}`, 20, 3600)))
    return NextResponse.json({ error: "Too many AI requests. Try again in an hour." }, { status: 429 });

  const { patientId } = (await request.json().catch(() => ({}))) as { patientId?: string };
  if (!patientId) return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  const supabase = await createClient();
  const admin = createAdminClient();

  // Verify staff can access this patient (RLS).
  const { data: patient } = await supabase
    .from("patients")
    .select("id, first_name, last_name, sex")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  // Gather context (all admin to avoid N+1 policy round-trips).
  const [intakeRes, scanRes, labRes, visitRes] = await Promise.all([
    admin.from("intake_forms").select("form_data").eq("patient_id", patientId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("scans").select("id, scan_date, parsed_findings, ai_synthesis")
      .eq("patient_id", patientId).order("scan_date", { ascending: false }).limit(1).maybeSingle(),
    admin.from("lab_results").select("marker, value, unit, optimal_low, optimal_high, category, collected_on")
      .eq("patient_id", patientId).order("collected_on", { ascending: false }).limit(20),
    admin.from("visits").select("id", { count: "exact", head: true }).eq("patient_id", patientId),
  ]);

  const fd = (intakeRes.data?.form_data as Record<string, unknown>) ?? {};
  const scan = scanRes.data;
  const labs = labRes.data ?? [];
  const visitCount = visitRes.count ?? 0;

  // Build a focused, non-PHI-heavy prompt.
  const chiefComplaint = String(fd["chief_complaint"] ?? fd["reason_visit"] ?? fd["main_concern"] ?? "Not provided");
  const healthGoals = String(fd["health_goals"] ?? fd["goals"] ?? "Not provided");
  const healthHistory = String(fd["medical_history"] ?? fd["health_history"] ?? fd["past_history"] ?? "Not provided");
  const medications = String(fd["medications"] ?? fd["current_medications"] ?? "None reported");

  const labLines = labs.length
    ? labs.map((l) => {
        const oor = l.optimal_low != null && l.optimal_high != null
          ? (l.value < l.optimal_low ? " ↓" : l.value > l.optimal_high ? " ↑" : "")
          : "";
        return `  ${l.marker}: ${l.value} ${l.unit ?? ""}${oor}`;
      }).join("\n")
    : "  No labs on file";

  const scanFindings = scan?.parsed_findings
    ? JSON.stringify(scan.parsed_findings, null, 2).slice(0, 1500)
    : "No scan findings on file";

  const prompt = `Patient: ${patient.first_name} ${patient.last_name} (${patient.sex ?? "unspecified sex"}), ${visitCount} prior visits.

Chief complaint / reason for visit: ${chiefComplaint}
Health goals: ${healthGoals}
Relevant health history: ${healthHistory}
Current medications/supplements: ${medications}

Latest scan findings (${scan?.scan_date ?? "date unknown"}):
${scanFindings}

Recent labs:
${labLines}

Write a concise clinical session briefing (2–3 paragraphs) for the practitioner to read before this visit. Summarize the key findings and patterns, highlight out-of-range markers or scan areas of concern, and suggest 2–3 focus areas for the session. Write in third person, clinically but plainly. Do not repeat the patient's name more than once. Do not include a title or headers.`;

  const synthesis = await generateText({
    system:
      "You are a clinical synthesis assistant for an integrative medicine clinic (Casa Elev8). " +
      "You help practitioners prepare for patient visits by summarizing health data into a brief, actionable briefing. " +
      "Be factual, concise, and never make diagnostic claims — frame findings as areas to explore.",
    prompt,
    maxTokens: 600,
  });

  // Persist to the LATEST scan row by its id. PostgREST ignores .order()/.limit() on an
  // UPDATE, so filtering by id is the only way to avoid overwriting ai_synthesis on every
  // one of the patient's historical scans.
  if (scan?.id) {
    await admin.from("scans").update({ ai_synthesis: synthesis }).eq("id", scan.id);
  }

  await logAudit({ action: "ai_synthesis", resource: "patients", resourceId: patientId, patientId });

  return NextResponse.json({ synthesis });
}
