// PRODUCER: message-reply draft.
// Drafts a reply to a patient, grounded in the recent message thread plus the
// patient's plan/intake/labs. Enqueues a 'message_reply' draft for approval.
// Non-diagnostic: the draft is a SUGGESTION the doctor edits + approves before
// anything is sent.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const allowed = await rateLimit(`msgreply:${ip}`, 30, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { patientId, messageId, threadContext } = (await request
    .json()
    .catch(() => ({}))) as {
    patientId?: string;
    messageId?: string;
    threadContext?: string;
  };

  const guard = await guardProducer(patientId, "ai-message-reply");
  if (!guard.ok) return guard.response;
  const { patient } = guard;

  // Pull the recent thread (admin after RLS access already verified by guard).
  const admin = createAdminClient();
  const { data: msgs } = await admin
    .from("messages")
    .select("sender, body, created_at")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const thread = (msgs ?? [])
    .slice()
    .reverse()
    .map((m) => `${m.sender === "patient" ? "Patient" : "Clinic"}: ${m.body}`)
    .join("\n");

  const threadBlock =
    thread.trim() ||
    (threadContext && threadContext.trim()) ||
    "  No prior messages on file";

  const ctx = await gatherPatientContext(patient.id);
  const intake = intakeSummary(ctx.intake);

  const prompt = `You are drafting a reply FROM the clinic TO the patient ${patient.first_name}.

Recent message thread (oldest to newest):
${threadBlock}

Patient context for grounding:
Reason for care: ${intake.chiefComplaint}
Health goals: ${intake.healthGoals}
Current medications/supplements: ${intake.medications}
Recent labs:
${labLines(ctx.labs)}

Draft a warm, clear, and professional reply to the patient's most recent message. Ground it ONLY in the context above and the patient's plan; if the question requires information not present here, say the clinician will follow up rather than guessing. Do not make a diagnosis, do not prescribe, and do not change any treatment — this is a draft a clinician will review and may edit before sending. Return only the message body (no subject line, no signature placeholder).`;

  const draftContent = await generateText({
    system:
      "You draft patient-facing message replies for an integrative medicine clinic. " +
      "Replies are reviewed and approved by a clinician before sending. " +
      "Be warm, concise, and accurate; never diagnose, prescribe, or alter treatment. " +
      "When unsure, defer to the clinician rather than speculating.",
    prompt,
    maxTokens: 500,
  });

  const draftId = await createDraft({
    patientId: patient.id,
    kind: "message_reply",
    draftContent,
    model: PRODUCER_MODEL,
    sourceRef: { producer: "message_reply", messageId: messageId ?? null },
    targetTable: "messages",
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
