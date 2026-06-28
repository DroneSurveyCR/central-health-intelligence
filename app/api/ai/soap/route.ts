// PRODUCER: SOAP / visit-note draft.
// Pulls recent visit/intake/lab/wearable context, asks the model for a
// structured SOAP note, and enqueues it as a 'visit_note' draft for approval.
// Non-diagnostic: the draft is a SUGGESTION the doctor edits + approves.

import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";
import { createDraft } from "@/lib/ai/drafts";
import { logAudit } from "@/lib/auth/audit";
import {
  guardProducer,
  gatherPatientContext,
  intakeSummary,
  labLines,
  PRODUCER_MODEL,
} from "@/lib/ai/producers";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const allowed = await rateLimit(`soap:${ip}`, 30, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { patientId, visitId, transcript } = (await request
    .json()
    .catch(() => ({}))) as {
    patientId?: string;
    visitId?: string;
    transcript?: string;
  };

  const guard = await guardProducer(patientId, "ai-soap");
  if (!guard.ok) return guard.response;
  const { patient } = guard;

  const ctx = await gatherPatientContext(patient.id);
  const intake = intakeSummary(ctx.intake);

  const visitLines = ctx.visits.length
    ? ctx.visits
        .map((v) => `  ${v.visit_date ?? v.created_at}: ${v.summary ?? "(no summary)"}`)
        .join("\n")
    : "  No prior visits on file";

  const prompt = `Patient: ${patient.first_name} ${patient.last_name} (${patient.sex ?? "unspecified sex"}), ${ctx.visitCount} prior visits.

Chief complaint / reason for visit: ${intake.chiefComplaint}
Health goals: ${intake.healthGoals}
Relevant health history: ${intake.healthHistory}
Current medications/supplements: ${intake.medications}

Recent visit summaries:
${visitLines}

Recent labs:
${labLines(ctx.labs)}
${
  transcript && transcript.trim()
    ? `\nClinician's notes / visit transcript for THIS visit:\n${transcript.trim().slice(0, 6000)}`
    : ""
}

Write a structured SOAP note for this visit using the patient data above${
    transcript && transcript.trim() ? " and the clinician's notes for this visit" : ""
  }. Use exactly these four headed sections:

Subjective:
Objective:
Assessment:
Plan:

Ground every statement in the data provided; do not invent findings. Frame the Assessment as clinical impressions / areas to explore, never as a definitive diagnosis. Keep it concise and clinically plain.`;

  const draftContent = await generateText({
    system:
      "You are a clinical documentation assistant for an integrative medicine clinic. " +
      "You draft SOAP visit notes from real patient data for a clinician to review, edit, and approve. " +
      "Be factual and concise. Never assert a definitive diagnosis — frame impressions as areas to explore.",
    prompt,
    maxTokens: 900,
  });

  const draftId = await createDraft({
    patientId: patient.id,
    kind: "visit_note",
    draftContent,
    model: PRODUCER_MODEL,
    sourceRef: { producer: "soap", visitId: visitId ?? null, hasTranscript: Boolean(transcript) },
    targetTable: "visits",
    targetId: visitId,
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
