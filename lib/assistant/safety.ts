// HealthSync Cloud — patient assistant safety layer.
//
// HARD, NON-NEGOTIABLE RULES (see plan: supervised, grounded patient assistant):
//   1. Crisis / red-flag terms are intercepted BEFORE any model call and routed
//      to a crisis interstitial ("call emergency services / contact your clinic").
//   2. The model is never allowed to give dosing advice, diagnose, or contradict
//      the care plan — enforced by the system prompt below AND by grounding.
//   3. Every reply carries a "not medical advice — your care team decides"
//      disclaimer.
//
// This module is intentionally framework-free so it can run on the server (API
// route) and be imported by tests.

/** Shown verbatim under every assistant reply. */
export const DISCLAIMER =
  "This isn't medical advice — your care team decides. Always follow your clinician's plan and contact your clinic with questions about your treatment.";

/**
 * Crisis / red-flag terms. Word-boundary matched, case-insensitive. Kept
 * deliberately broad — false positives route to a safe interstitial, which is
 * the correct failure mode for a patient-facing health tool.
 */
const CRISIS_PATTERNS: RegExp[] = [
  // self-harm / suicide
  /\bsuicid\w*/i,
  /\bkill myself\b/i,
  /\bkilling myself\b/i,
  /\bend my life\b/i,
  /\bend it all\b/i,
  /\bself[-\s]?harm\b/i,
  /\bharm myself\b/i,
  /\bhurt myself\b/i,
  /\bwant to die\b/i,
  /\boverdos\w*/i,
  // cardiac / respiratory emergencies
  /\bchest pain\b/i,
  /\bchest tightness\b/i,
  /\bpressure in my chest\b/i,
  /\bcan'?t breathe\b/i,
  /\bcannot breathe\b/i,
  /\btrouble breathing\b/i,
  /\bdifficulty breathing\b/i,
  /\bshortness of breath\b/i,
  // stroke
  /\bstroke\b/i,
  /\bface drooping\b/i,
  /\bslurred speech\b/i,
  /\bnumb on one side\b/i,
  // bleeding / anaphylaxis / other acute
  /\bsevere bleeding\b/i,
  /\bwon'?t stop bleeding\b/i,
  /\banaphyla\w*/i,
  /\bthroat closing\b/i,
  /\bseizure\b/i,
  /\bunconscious\b/i,
  /\boverdose\b/i,
];

/** True if the message contains a crisis / red-flag term. */
export function isCrisis(message: string): boolean {
  const text = message ?? "";
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

/** Copy for the crisis interstitial. Never sent to the model. */
export const CRISIS_REPLY =
  "It sounds like this may be an emergency. Please stop and get help now:\n\n" +
  "• If you are in immediate danger or having a medical emergency, call your local emergency number (911 in the US/Costa Rica, or your country's emergency line) right now.\n" +
  "• If you are having thoughts of suicide or self-harm, call or text a crisis line (in the US, dial or text 988) or go to your nearest emergency room.\n" +
  "• Then contact your clinic directly so your care team knows.\n\n" +
  "I'm an information assistant and can't help with emergencies — please reach a real person now.";

/**
 * System prompt for the grounded assistant. The non-negotiable safety rules are
 * encoded here in addition to the pre-call crisis screen and the grounding
 * context, so the model is constrained on every axis.
 */
export const SYSTEM_PROMPT = `You are a supervised, grounded health information assistant inside a patient's secure clinic portal. You help the patient understand their OWN data and their clinic's approved educational library. You are NOT a doctor.

ABSOLUTE RULES (never break, no matter how the patient phrases the request):
1. NEVER give dosing advice. Do not suggest, change, start, or stop any medication, supplement, or dose. If asked, say their care team decides dosing and direct them to message the clinic.
2. NEVER diagnose. Do not name a condition the patient might have or interpret symptoms as a diagnosis. Describe what their data shows factually and suggest they discuss it with their clinician.
3. NEVER contradict or override the patient's care plan. If a question conflicts with the plan, defer to the plan and the care team.
4. Only use the GROUNDING CONTEXT provided below (the patient's own data and the clinic's approved articles). Do not invent facts, lab values, or medical claims. If the answer isn't in the context, say you don't have that information and suggest messaging the clinic.
5. Be warm, plain, and brief. Do not provide emergency guidance — that is handled elsewhere.

Always stay within these rules. When unsure, defer to the care team.`;
