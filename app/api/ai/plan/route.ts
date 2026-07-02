// Doctor-side AI producer: drafts a structured 90-day plan from the client's
// uploaded data (intake, labs, latest scan). The result is written as a plan
// with status 'draft' + phases + items — the doctor reviews it on the plan page
// and flips it to 'active'. Nothing reaches the client until the doctor approves.
//
// Mirrors the access-check + grounded-context pattern of app/api/ai/synthesis.

import { requireStaffApi } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { generateText, aiEnabled } from "@/lib/ai";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";
import type { PlanLevel } from "@/lib/plan/helpers";
import { gatherPracticeKnowledge, practiceKnowledgeBlock } from "@/lib/ai/producers";

const LEVELS: PlanLevel[] = ["supplement", "modality", "habit", "measurement"];
const coerceLevel = (v: unknown): PlanLevel =>
  LEVELS.includes(v as PlanLevel) ? (v as PlanLevel) : "habit";

type DraftItem = { level: PlanLevel; name: string; dose: string | null; detail: string | null };
type DraftPhase = { name: string; start_day: number; end_day: number; items: DraftItem[] };

export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;

  if (!aiEnabled)
    return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });

  // Plan drafting is heavier than a text draft — keep it modest per practitioner.
  if (!(await rateLimit(`ai-plan:${me.id}`, 12, 3600)))
    return NextResponse.json({ error: "Too many AI requests. Try again in an hour." }, { status: 429 });

  const { patientId } = (await request.json().catch(() => ({}))) as { patientId?: string };
  if (!patientId) return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  const supabase = await createClient();
  const admin = createAdminClient();

  // Verify staff can access this client (RLS via the user-scoped client).
  const { data: client } = await supabase
    .from("patients")
    .select("id, first_name, last_name, sex")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Grounded context from uploaded data (admin reads after the RLS check above).
  const [intakeRes, scanRes, labRes, visitRes] = await Promise.all([
    admin.from("intake_forms").select("form_data").eq("patient_id", patientId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("scans").select("scan_date, parsed_findings, ai_synthesis")
      .eq("patient_id", patientId).order("scan_date", { ascending: false }).limit(1).maybeSingle(),
    admin.from("lab_results").select("marker, value, unit, optimal_low, optimal_high, collected_on")
      .eq("patient_id", patientId).order("collected_on", { ascending: false }).limit(25),
    admin.from("visits").select("id", { count: "exact", head: true }).eq("patient_id", patientId),
  ]);

  const fd = (intakeRes.data?.form_data as Record<string, unknown>) ?? {};
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = fd[k];
      if (v != null && String(v).trim() !== "") return String(v);
    }
    return "Not provided";
  };
  const labs = labRes.data ?? [];
  const labLines = labs.length
    ? labs.map((l) => {
        const oor = l.optimal_low != null && l.optimal_high != null
          ? (l.value < l.optimal_low ? " (low)" : l.value > l.optimal_high ? " (high)" : "")
          : "";
        return `  ${l.marker}: ${l.value} ${l.unit ?? ""}${oor}`;
      }).join("\n")
    : "  No labs on file";
  const scan = scanRes.data;
  const scanFindings = scan?.ai_synthesis
    ? String(scan.ai_synthesis).slice(0, 1200)
    : scan?.parsed_findings
      ? JSON.stringify(scan.parsed_findings).slice(0, 1200)
      : "No scan findings on file";

  const kb = await gatherPracticeKnowledge();

  const prompt = `Client: ${client.first_name} ${client.last_name} (${client.sex ?? "unspecified sex"}), ${visitRes.count ?? 0} prior visits.

Chief complaint / reason: ${pick("chief_complaint", "reason_visit", "main_concern")}
Health goals: ${pick("health_goals", "goals")}
Relevant history: ${pick("medical_history", "health_history", "past_history")}
Current medications/supplements: ${pick("medications", "current_medications")}

Latest scan findings (${scan?.scan_date ?? "date unknown"}):
${scanFindings}

Recent labs:
${labLines}

${practiceKnowledgeBlock(kb)}

Draft a 90-day health plan for the doctor to review and approve. Draw supplements from this clinic's own formulary and modalities from the services it offers above wherever clinically appropriate — the plan should read as THIS clinic's, using what the doctor actually stocks and provides. If nothing in the clinic's catalog fits a need, you may suggest a general option and keep it conservative. Use 3 phases that span the 90 days (roughly days 1-30, 31-60, 61-90). For each phase, list a small, realistic set of items the client can follow. Each item has a "level" of exactly one of: "supplement", "modality", "habit", "measurement". Give a concrete name; for supplements include a typical starting "dose"; keep "detail" to one short clause. Ground the plan in the data above; do NOT invent lab values or diagnoses. Keep it practical — at most 6 items per phase.

Respond with ONLY valid minified JSON, no markdown, in exactly this shape:
{"title":"...","phases":[{"name":"...","start_day":1,"end_day":30,"items":[{"level":"supplement","name":"...","dose":"...","detail":"..."}]}]}`;

  let raw: string;
  try {
    raw = await generateText({
      system:
        "You are a clinical planning assistant for an integrative medicine practice. You draft a 90-day " +
        "plan for a DOCTOR to review, edit and approve — never a final prescription. Be practical and " +
        "conservative, never make diagnostic claims, and frame everything as a starting draft the doctor " +
        "will adjust. Output strict JSON only.",
      prompt,
      maxTokens: 2200,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI request failed" }, { status: 502 });
  }

  // Parse — tolerate stray prose or ```json fences by extracting the first {...} block.
  let parsed: { title?: string; phases?: DraftPhase[] };
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
  } catch {
    return NextResponse.json({ error: "AI returned an unreadable plan. Try again." }, { status: 502 });
  }

  const phases = Array.isArray(parsed.phases) ? parsed.phases.slice(0, 4) : [];
  if (phases.length === 0)
    return NextResponse.json({ error: "AI returned no plan phases. Try again." }, { status: 502 });

  // Create the draft plan (90 days from today), owned by this practitioner.
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + 90 * 86400000).toISOString().slice(0, 10);

  const { data: createdPlan, error: planErr } = await admin
    .from("plans")
    .insert({
      patient_id: patientId,
      practitioner_id: me.id,
      title: (parsed.title ? String(parsed.title) : "90-Day Plan").slice(0, 120) + " (AI draft)",
      start_date: startDate,
      end_date: endDate,
      status: "draft",
    })
    .select("id")
    .maybeSingle();
  if (planErr || !createdPlan)
    return NextResponse.json({ error: planErr?.message ?? "could not create plan" }, { status: 400 });
  const planId = createdPlan.id;

  // Insert phases, then items mapped to their phase.
  const phaseRows = phases.map((ph, i) => ({
    plan_id: planId,
    phase_number: i + 1,
    name: (ph.name ? String(ph.name) : `Phase ${i + 1}`).slice(0, 120),
    start_offset_days: Number.isFinite(ph.start_day) ? Math.max(0, Math.floor(Number(ph.start_day) - 1)) : i * 30,
    end_offset_days: Number.isFinite(ph.end_day) ? Math.floor(Number(ph.end_day)) : (i + 1) * 30,
  }));
  const { data: insertedPhases, error: phErr } = await admin
    .from("plan_phases")
    .insert(phaseRows)
    .select("id, phase_number");
  if (phErr)
    return NextResponse.json({ error: phErr.message }, { status: 400 });

  const phaseIdByNumber = new Map<number, string>(
    (insertedPhases ?? []).map((p) => [p.phase_number as number, p.id as string]),
  );

  const itemRows: Array<Record<string, unknown>> = [];
  phases.forEach((ph, i) => {
    const phaseId = phaseIdByNumber.get(i + 1) ?? null;
    const items = Array.isArray(ph.items) ? ph.items.slice(0, 6) : [];
    for (const it of items) {
      const name = it?.name ? String(it.name).trim().slice(0, 200) : "";
      if (!name) continue;
      itemRows.push({
        plan_id: planId,
        phase_id: phaseId,
        level: coerceLevel(it?.level),
        name,
        dose: it?.dose ? String(it.dose).slice(0, 200) : null,
        detail: it?.detail ? String(it.detail).slice(0, 500) : null,
      });
    }
  });
  if (itemRows.length > 0) {
    const { error: itErr } = await admin.from("plan_items").insert(itemRows);
    if (itErr) return NextResponse.json({ error: itErr.message }, { status: 400 });
  }

  await logAudit({ action: "create", resource: "plans", resourceId: planId, patientId });

  return NextResponse.json({ ok: true, plan_id: planId, phases: phaseRows.length, items: itemRows.length });
}
