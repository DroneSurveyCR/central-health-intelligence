// HealthSync Cloud — patient assistant API.
//
// POST { message } -> { reply, crisis?, aiEnabled, disclaimer }
//
// Pipeline (order matters — safety first):
//   1. Auth: must be a logged-in patient (getCurrentPatient → tenant/patient scope).
//   2. Module gate: engagement must be enabled, else 403.
//   3. SAFETY: crisis term screen BEFORE any model call. On hit → return the
//      crisis interstitial and DO NOT touch the model.
//   4. Grounding: build context from the patient's own data + approved articles.
//   5. AI: if ANTHROPIC_API_KEY is set, call the existing AI client constrained
//      to the grounding + safety system prompt. If not set, degrade gracefully
//      with a fact-based answer (or an "AI not enabled" notice). Never crash.
//   6. Disclaimer is attached to every (non-crisis) reply by the client.

import { NextResponse } from "next/server";
import { getCurrentPatient } from "@/lib/auth/roles";
import { getEnabledModules } from "@/lib/modules/requireModule";
import { generateText, aiEnabled } from "@/lib/ai";
import { rateLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/auth/audit";
import {
  isCrisis,
  CRISIS_REPLY,
  DISCLAIMER,
  SYSTEM_PROMPT,
} from "@/lib/assistant/safety";
import { buildGrounding, answerFromFacts } from "@/lib/assistant/grounding";

export async function POST(request: Request) {
  // 1. Auth — patient scope.
  const me = await getCurrentPatient();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 2. Module gate.
  if (!(await getEnabledModules()).has("engagement")) {
    return NextResponse.json(
      { error: "The patient assistant requires the engagement module." },
      { status: 403 },
    );
  }

  const { message } = (await request.json().catch(() => ({}))) as { message?: string };
  const text = (message ?? "").trim();
  if (!text) return NextResponse.json({ error: "missing message" }, { status: 400 });
  if (text.length > 2000)
    return NextResponse.json({ error: "message too long" }, { status: 400 });

  // 3. SAFETY — crisis screen BEFORE the model. Non-negotiable.
  if (isCrisis(text)) {
    // Log the interaction type (not the message content) for clinic visibility.
    await logAudit({ action: "view", resource: "assistant_crisis", patientId: me.id });
    return NextResponse.json({
      reply: CRISIS_REPLY,
      crisis: true,
      aiEnabled,
      disclaimer: DISCLAIMER,
    });
  }

  // Rate limit (fails open). Protects the model spend per patient.
  if (!(await rateLimit(`assistant:${me.id}`, 30, 3600))) {
    return NextResponse.json(
      { error: "You've sent a lot of messages. Please try again in a little while." },
      { status: 429 },
    );
  }

  // 4. Grounding — patient's own data + approved library only.
  const grounding = await buildGrounding(me.id);

  // 5a. AI disabled → graceful degradation.
  if (!aiEnabled) {
    const offline = answerFromFacts(text, grounding);
    if (offline) {
      return NextResponse.json({
        reply: offline,
        aiEnabled: false,
        disclaimer: DISCLAIMER,
      });
    }
    return NextResponse.json({
      reply:
        "AI chat isn't enabled yet on this clinic. I can still pull up your own data — try asking about your plan, your latest labs, or your wearable summary. For anything else, please message your care team.",
      aiEnabled: false,
      disclaimer: DISCLAIMER,
    });
  }

  // 5b. AI enabled → constrained, grounded call.
  let reply: string;
  try {
    reply = await generateText({
      system: SYSTEM_PROMPT,
      prompt: [
        "GROUNDING CONTEXT (answer ONLY from this — do not invent anything):",
        grounding.context,
        "",
        `PATIENT QUESTION: ${text}`,
        "",
        "Answer briefly and plainly, strictly within the rules and the grounding context above. Do not give dosing advice, do not diagnose, do not contradict the care plan.",
      ].join("\n"),
      maxTokens: 500,
    });
  } catch {
    // Model hiccup — fall back to grounded facts rather than erroring out.
    const offline = answerFromFacts(text, grounding);
    return NextResponse.json({
      reply:
        offline ??
        "I'm having trouble answering right now. Please try again shortly, or message your care team.",
      aiEnabled: true,
      disclaimer: DISCLAIMER,
    });
  }

  await logAudit({ action: "view", resource: "assistant", patientId: me.id });

  return NextResponse.json({ reply, aiEnabled: true, disclaimer: DISCLAIMER });
}
