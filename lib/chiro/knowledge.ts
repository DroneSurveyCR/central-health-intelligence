// Chiro vertical AI knowledge + scope guardrail.
//
// The assistant answers ONLY chiropractic / spine / musculoskeletal questions,
// grounded in this knowledge base + the clinic's own published content. Two layers
// enforce scope: classifyScope() is a cheap DETERMINISTIC pre-filter that fast-refuses
// obvious off-topic questions (no model call), and CHIRO_SYSTEM_PROMPT is the model-side
// backstop that refuses anything the heuristic let through. Education only — never a
// diagnosis or prescription.

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

// Compact grounding corpus — condensed from verticals/chiro/knowledge-base.md.
export const CHIRO_KB = `Chiropractic — spine & musculoskeletal reference (education only; not a diagnosis).
Spine: 33 vertebrae — cervical C1-C7 (C1 Atlas, C2 Axis), thoracic T1-T12 (rib-bearing), lumbar L1-L5 (load-bearing), sacrum S1-S5 (fused), coccyx. Intervertebral discs C2-C3 through L5-S1 (annulus fibrosus + nucleus pulposus); pathology progresses bulge -> herniation -> degeneration (DDD).
Curves (radiographic norms): cervical lordosis 20-40 deg, thoracic kyphosis 20-40 deg, lumbar lordosis 20-35 deg. Scoliosis by Cobb angle: <10 none, 10-25 mild, 25-40 moderate, >40 severe.
Assessment: history/chief complaint, postural analysis (forward-head posture = ear anterior to shoulder), static + motion palpation (fixation / hypomobility / hypermobility), range of motion, orthopedic + neurological tests, imaging (X-ray for Cobb angle and listings, MRI for disc/nerve, thermal scan e.g. Tytron).
Terminology: subluxation / vertebral subluxation complex = a segment's misalignment or dysfunction affecting the nervous system, described by listing/direction (anterior/posterior, left/right, rotation). Other findings: stenosis, spondylosis, spondylolisthesis, facet syndrome. Analysis frameworks: Gonstead, Palmer, diversified. Documentation: SOAP notes, Report of Findings.
Dermatomes (level -> zone): C6 thumb, C7 middle finger, T4 nipple line, T10 umbilicus, L4 medial ankle & big toe, L5 dorsum of foot, S1 lateral foot & heel.
Treatment (3-phase model): relief/acute (2-6 weeks, 2-3x/week) to reduce pain; corrective/stabilization (6-12 weeks, 1-2x/week) to restore alignment and function; maintenance/wellness (ongoing, 1-2x/month) to prevent recurrence. Tools: adjustments/manipulation, home-exercise program, ergonomics, lifestyle. A 30-60-90 day plan maps onto the three phases.
Rule: never diagnose or prescribe; provide general education and defer to the treating clinician.`;

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
