// PRODUCER: biomarker / wearable narrative.
// Summarizes the patient's recent labs + wearable/CGM data into a plain-language
// narrative and enqueues it as a 'wearable_narrative' draft for approval.
// (The approval queue's DraftKind enum names this kind `wearable_narrative`.)
// Non-diagnostic: the draft is a SUGGESTION the doctor edits + approves.

import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";
import { createDraft } from "@/lib/ai/drafts";
import { logAudit } from "@/lib/auth/audit";
import {
  guardProducer,
  gatherPatientContext,
  labLines,
  wearableLines,
  PRODUCER_MODEL,
} from "@/lib/ai/producers";

export async function POST(request: Request) {
  const { patientId } = (await request.json().catch(() => ({}))) as {
    patientId?: string;
  };

  const guard = await guardProducer(patientId, "ai-narrative");
  if (!guard.ok) return guard.response;
  const { patient } = guard;

  const ctx = await gatherPatientContext(patient.id);

  if (ctx.labs.length === 0 && ctx.wearables.length === 0)
    return NextResponse.json(
      { error: "No labs or wearable data on file to summarize." },
      { status: 422 },
    );

  const prompt = `Patient: ${patient.first_name} ${patient.last_name} (${patient.sex ?? "unspecified sex"}).

Recent labs (most recent first):
${labLines(ctx.labs)}

Recent wearable / CGM daily summaries (most recent first):
${wearableLines(ctx.wearables)}

Write a plain-language narrative (2–4 short paragraphs) that summarizes what this patient's recent biomarkers and wearable data show. Describe trends and any out-of-range or notable values in everyday language a patient could understand. Ground every statement in the data above; do not invent values. Do NOT diagnose and do NOT recommend specific treatments — frame anything notable as something to discuss with the clinician. No title or headers.`;

  const draftContent = await generateText({
    system:
      "You summarize biomarker and wearable data into plain-language narratives for an integrative medicine clinic. " +
      "Output is reviewed and approved by a clinician before use. " +
      "Be factual and accessible; never diagnose or prescribe — frame notable findings as topics to discuss.",
    prompt,
    maxTokens: 700,
  });

  const draftId = await createDraft({
    patientId: patient.id,
    kind: "wearable_narrative",
    draftContent,
    model: PRODUCER_MODEL,
    sourceRef: {
      producer: "narrative",
      labCount: ctx.labs.length,
      wearableDays: ctx.wearables.length,
    },
  });

  if (!draftId)
    return NextResponse.json({ error: "Could not save draft" }, { status: 500 });

  await logAudit({
    action: "ai_synthesis",
    resource: "ai_drafts",
    resourceId: draftId,
    patientId: patient.id,
  });

  return NextResponse.json({ draftId });
}
