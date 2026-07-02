// Chiro vertical AI scope guardrail.
//
// The assistant answers ONLY chiropractic / spine / musculoskeletal questions,
// grounded in the clinic's own published articles (see lib/knowledge/defaultLibraries.ts
// for the seedable starter content — real articles a doctor can edit or disable, not a
// hardcoded blob). Two layers enforce scope: classifyScope() is a cheap DETERMINISTIC
// pre-filter that fast-refuses obvious off-topic questions (no model call), and
// CHIRO_SYSTEM_PROMPT is the model-side backstop that refuses anything the heuristic
// let through. Education only — never a diagnosis or prescription.

export const CHIRO_SYSTEM_PROMPT =
  "You are a chiropractic knowledge assistant for a clinic. Answer ONLY questions about " +
  "chiropractic, the spine, musculoskeletal health, posture, biomechanics, and directly-related " +
  "subjects (adjustments and therapies a chiropractic clinic offers, and patient education for " +
  "spine/MSK). Ground every answer in the provided knowledge base and clinic content — do not " +
  "invent facts, values, or protocols. NEVER give a diagnosis or prescribe treatment; frame " +
  "everything as general education and defer to the treating clinician. If a question is outside " +
  "chiropractic / spine / musculoskeletal scope, politely decline with exactly: " +
  "'I can only help with chiropractic and spine or musculoskeletal topics — please ask your " +
  "clinician about that.' Keep answers concise and plain.";

export const REFUSAL =
  "I can only help with chiropractic and spine or musculoskeletal topics — please ask your clinician about that.";

// In-scope vocabulary (spine / MSK / chiropractic). Presence => in scope.
export const IN_SCOPE_TERMS = [
  "spine", "spinal", "vertebra", "vertebrae", "cervical", "thoracic", "lumbar", "sacrum", "sacral",
  "coccyx", "disc", "herniat", "bulg", "subluxation", "chiro", "adjust", "manipulat", "posture",
  "postural", "scoliosis", "kyphosis", "lordosis", "cobb", "dermatome", "sciatic", "facet",
  "stenosis", "spondyl", "neck pain", "back pain", "low back", "musculoskeletal", "msk", "ligament",
  "tendon", "fixation", "mobility", "range of motion", "palpation", "gonstead", "tytron", "whiplash",
  "pinched nerve", "alignment", "atlas", "vertebral", "adjustment", "decompression",
  "c1", "c2", "c3", "c4", "c5", "c6", "c7", "t1", "t2", "l1", "l2", "l3", "l4", "l5", "s1",
];

// Clearly other-domain terms. Used ONLY to fast-refuse when no in-scope term is present.
export const OUT_SCOPE_TERMS = [
  "cancer", "tumor", "oncolog", "chemotherap", "cardiac", "heart attack", "cardiolog", "diabetes",
  "insulin", "depression", "antidepress", "psychiatr", "pregnan", "obstetr", "dermatolog", "acne",
  "covid", "vaccine", "dental", "cavity", "glaucoma", "kidney stone", "hepat", "thyroid", "stock",
  "invest", "weather", "recipe", "politic", "election", "cryptocurrency", "homework", "essay",
];

export type ScopeResult = "in" | "out" | "unknown";

/** Deterministic pre-filter. "in" => answer; "out" => fast-refuse; "unknown" => let the model decide. */
export function classifyScope(question: string): ScopeResult {
  const q = (question || "").toLowerCase();
  if (IN_SCOPE_TERMS.some((t) => q.includes(t))) return "in";
  if (OUT_SCOPE_TERMS.some((t) => q.includes(t))) return "out";
  return "unknown";
}
