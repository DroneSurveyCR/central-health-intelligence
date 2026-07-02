// Default, pre-populated knowledge-base content per vertical — real `articles`
// rows a practice can import, review, and individually publish/unpublish.
// This is the reusable pattern: any vertical can register a library here.
//
// Why articles, not a hardcoded per-vertical constant: gatherPracticeKnowledge()
// (doctor AI producers) and buildGrounding() (patient assistant) already read
// published articles — so importing a library grounds BOTH sides of the AI with
// zero extra wiring, and a doctor can disable any single article without a
// developer touching code.
//
// Populate a library only from real, research-checked clinical content — an
// empty/absent entry for a vertical is honest; a thin fabricated one is not.

export type DefaultArticle = {
  slugBase: string; // suffixed with a per-practice fragment at seed time (see seedDefaultLibrary)
  title: string;
  category: string;
  excerpt: string;
  body: string;
  read_minutes: number;
};

export type DefaultLibrary = {
  slug: string;
  label: string;
  description: string;
  articles: DefaultArticle[];
};

const CHIROPRACTIC: DefaultLibrary = {
  slug: "chiropractic",
  label: "Chiropractic starter knowledge base",
  description:
    "General spine/MSK clinical reference — anatomy, assessment terminology, curve norms, dermatomes, and a standard 3-phase treatment model. Grounds your AI on day one; review each article and disable anything that doesn't match how you practice.",
  articles: [
    {
      slugBase: "chiro-spine-anatomy",
      title: "Spine anatomy & vertebral regions",
      category: "Foundations",
      excerpt: "The 33 vertebrae, four regions, and the discs between them.",
      read_minutes: 4,
      body: [
        "The spine is 33 vertebrae across four regions. Cervical (C1-C7) supports the head and neck — C1 (Atlas) allows nodding, C2 (Axis) allows rotation. Thoracic (T1-T12) is rib-bearing and naturally kyphotic, more stable than the cervical spine. Lumbar (L1-L5) is the largest, most load-bearing region, naturally lordotic. The sacrum (S1-S5, fused) and coccyx close the column.",
        "Intervertebral discs sit between C2-C3 through L5-S1: a tough outer annulus fibrosus around a gel-like nucleus pulposus. Disc pathology progresses along a spectrum — bulge, then herniation, then degeneration (DDD) — and each stage has a different clinical picture and urgency.",
        "Spinal nerves exit through the intervertebral foramina and map to dermatomes — segmental strips of skin. A patient's pain pattern (e.g. numbness down the lateral forearm to the thumb) can localize which level is involved before imaging confirms it.",
      ].join("\n\n"),
    },
    {
      slugBase: "chiro-assessment-terminology",
      title: "Assessment terminology: subluxation, listings & motion",
      category: "Protocols",
      excerpt: "How findings get named and documented — listings, fixation, and the major technique systems.",
      read_minutes: 4,
      body: [
        "A subluxation (or vertebral subluxation complex) describes a segment's misalignment or dysfunction affecting the nervous system. It's typically documented as a listing — a direction: anterior/posterior, left/right, or rotation. Different technique systems (Gonstead, Palmer, diversified) use different listing conventions, but the underlying idea — where and which way a segment has shifted — is shared.",
        "Motion palpation classifies a segment as normal, hypomobile (restricted, often called 'fixated'), or hypermobile (excessive motion). Fixation is the most common finding driving an adjustment; hypermobility usually calls for stabilization work instead of manipulation.",
        "Other common findings: stenosis (narrowing — central, foraminal, or lateral), spondylosis (degenerative change), spondylolisthesis (one vertebra slipping relative to the next, graded I-IV), and facet syndrome (facet-joint-driven pain, often unilateral and worse on extension).",
      ].join("\n\n"),
    },
    {
      slugBase: "chiro-curves-scoliosis",
      title: "Sagittal curve norms & scoliosis grading",
      category: "Protocols",
      excerpt: "Normal ranges for the three spinal curves, and how scoliosis is graded by Cobb angle.",
      read_minutes: 3,
      body: [
        "The spine has three sagittal curves with normal radiographic ranges: cervical lordosis 20-40°, thoracic kyphosis 20-40°, lumbar lordosis 20-35°. Below the range is 'hypo' (e.g. a flattened cervical curve from forward-head posture); above is 'hyper' (e.g. excessive lumbar lordosis from anterior pelvic tilt).",
        "Scoliosis — lateral curvature in the coronal plane — is measured by Cobb angle and graded: under 10° is not clinically significant, 10-25° is mild, 25-40° is moderate, and over 40° is severe and typically warrants co-management or referral.",
        "These are general radiographic norms, not a substitute for reading the patient's own films. Use them as a quick reference when documenting findings, not as a diagnostic threshold on their own.",
      ].join("\n\n"),
    },
    {
      slugBase: "chiro-dermatome-reference",
      title: "Dermatome quick reference",
      category: "Foundations",
      excerpt: "Which spinal level corresponds to which skin zone — for localizing a patient's pain pattern.",
      read_minutes: 2,
      body: [
        "Dermatomes are the segmental skin zones each spinal nerve root supplies. As a quick reference: C5-C6 covers the lateral shoulder and upper arm; C6 the thumb; C7 the middle finger and posterior arm; T4 sits at the nipple line; T10 at the umbilicus; L4 the medial ankle and big toe; L5 the dorsum of the foot; S1 the lateral foot and heel.",
        "When a patient describes pain or numbness in one of these zones, it's a useful first clue to which level may be involved — always confirmed by the fuller exam (motion palpation, orthopedic and neurological testing), not by the dermatome map alone.",
      ].join("\n\n"),
    },
    {
      slugBase: "chiro-treatment-phases",
      title: "The 3-phase treatment model",
      category: "Protocols",
      excerpt: "How a course of chiropractic care typically progresses from relief to maintenance.",
      read_minutes: 3,
      body: [
        "A standard course of care runs in three phases. Relief/acute (2-6 weeks, typically 2-3 visits/week) focuses on reducing pain and inflammation. Corrective/stabilization (6-12 weeks, 1-2 visits/week) works on restoring alignment and function. Maintenance/wellness (ongoing, 1-2 visits/month) prevents recurrence once the corrective work has held.",
        "Each phase pairs adjustments/manipulation with supporting work: a home-exercise program, ergonomic changes, and lifestyle adjustments. A typical 30-60-90-day plan maps directly onto these three phases — days 1-30 relief, 31-60 corrective, 61-90 into maintenance — though the exact pacing depends on the individual case.",
      ].join("\n\n"),
    },
  ],
};

export const DEFAULT_LIBRARIES: Record<string, DefaultLibrary> = {
  chiropractic: CHIROPRACTIC,
};

export function listDefaultLibraries(): DefaultLibrary[] {
  return Object.values(DEFAULT_LIBRARIES);
}
