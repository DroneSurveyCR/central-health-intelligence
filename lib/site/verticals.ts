// Single source of truth for the per-vertical marketing pages ("Who it's for").
// One template (app/(site)/solutions/[slug]) + this data renders every page, the
// /solutions index, and the nav. Keep each entry short — the pages are one scroll.
//
// Every vertical shares the same loop: their device → a visual the client sees →
// an AI 90-day plan the doctor approves → progress both sides track. Blood analysis
// is universal — every importNote ends with "and any bloodwork."

export type VerticalStep = { title: string; body: string };

export type Vertical = {
  slug: string;
  name: string; // page H1 subject, e.g. "Bioresonance & biofeedback"
  doctor: string; // who it's for, shown as the kicker
  headline: string; // hero headline
  lead: string; // hero sub
  device: string; // what they measure / their hardware
  importNote: string; // "Upload your <device> — and any bloodwork."
  steps: [VerticalStep, VerticalStep, VerticalStep]; // device → visual → plan/track
  points: string[]; // 3 bullets
  shot: string; // /screens/<file>.png for the hero browser frame
  faq: [string, string][]; // 3 short Q&As
};

export const VERTICALS: Vertical[] = [
  {
    slug: "bioresonance",
    name: "Bioresonance & biofeedback",
    doctor: "For bioresonance & energy-medicine practitioners",
    headline: "Your scan, an instant 3D body.",
    lead: "Upload a ZYTO, SCIO, Asyra or Bicom scan and your client sees their body light up in 3D — then AI drafts the protocol and you track every re-scan.",
    device: "bioresonance / biofeedback scan (ZYTO, SCIO, Asyra, Bicom)",
    importNote: "Upload your scan PDF — and any bloodwork.",
    steps: [
      { title: "Upload the scan", body: "Drop in the scan PDF from your device. We read the systems and stressors automatically — no manual entry." },
      { title: "See it in 3D", body: "Findings map onto an interactive 3D body the client can explore, each region coloured by what's in or out of range." },
      { title: "Plan & re-scan", body: "AI drafts a 90-day protocol you approve, and each re-scan tracks what improved — proof the client can see." },
    ],
    points: [
      "ZYTO, SCIO, Asyra and Bicom scan PDFs read automatically",
      "Findings painted onto a 3D body the client understands",
      "Re-scan deltas tracked session over session",
    ],
    shot: "",
    faq: [
      ["Do I need to change my scanner?", "No. You keep your device — you just upload its PDF report and we turn it into the visual and the plan."],
      ["What if the data isn't structured?", "We parse the report's text into systems and severity. Anything we can't structure is still kept as the source document."],
      ["Can the client see their own results?", "Yes — they get the 3D visual and a plain-language read in their own app, plus an AI assistant for questions."],
    ],
  },
  {
    slug: "functional-medicine",
    name: "Functional medicine",
    doctor: "For functional & integrative-medicine doctors",
    headline: "Turn dense reports into a plan they follow.",
    lead: "DUTCH, GI-MAP and blood panels become clean trend visuals, an AI-drafted plan you approve, and a retest comparison — instead of a 35-page PDF the client never opens.",
    device: "DUTCH hormones, GI-MAP / microbiome, blood panels",
    importNote: "Upload DUTCH, GI-MAP and lab PDFs — and any bloodwork.",
    steps: [
      { title: "Upload the labs", body: "DUTCH hormone reports, GI-MAP stool panels and blood work — uploaded as PDF or CSV and mapped to functional ranges." },
      { title: "See the trends", body: "Markers become visual trends with optimal ranges, and gut dysbiosis and hormone patterns the client can actually read." },
      { title: "Plan & retest", body: "AI drafts the protocol you approve; the next panel shows recovery against the last — dysbiosis down, hormones balancing." },
    ],
    points: [
      "DUTCH, GI-MAP, organic acids and blood panels parsed to ranges",
      "Hormone and gut patterns shown as trends, not loose files",
      "Retest cycles compared automatically over time",
    ],
    shot: "be-results-review.png",
    faq: [
      ["Which labs work?", "DUTCH, GI-MAP and standard blood panels today, by PDF or CSV. Other functional panels import through the generic reader."],
      ["Does the AI diagnose?", "No. AI drafts the plan and notes from the data; you review, edit and approve before anything reaches the client."],
      ["Can I track retests?", "Yes — each new panel is compared to the prior one so progress is visible at a glance."],
    ],
  },
  {
    slug: "weight-loss",
    name: "Peptide, GLP-1 & weight-loss",
    doctor: "For peptide, GLP-1 & weight-loss clinics",
    headline: "Dose, body comp and labs on one timeline.",
    lead: "Track protocol, body composition and lab response together — while the client follows a clean daily plan and asks the AI their questions instead of texting you.",
    device: "GLP-1 / peptide protocols, InBody body composition, labs",
    importNote: "Upload body-comp scans and labs — and any bloodwork.",
    steps: [
      { title: "Set the protocol", body: "Build the GLP-1 or peptide protocol with dosing and titration; log administrations as you go." },
      { title: "See the response", body: "InBody scans and labs show recomposition — fat down, lean held — alongside the dose, on one timeline." },
      { title: "Plan & adhere", body: "The client follows a simple daily plan in their app, with an AI assistant for the questions that used to fill your inbox." },
    ],
    points: [
      "Protocol, dose and titration tracked over the program",
      "InBody / body-comp recomposition shown against the plan",
      "Client app keeps adherence high between visits",
    ],
    shot: "be-plan-builder.png",
    faq: [
      ["Does it handle titration?", "Yes — protocols carry a dosing schedule and you log each administration with site and notes."],
      ["What body-comp devices?", "InBody and Tanita exports import directly; other scales import by CSV."],
      ["How does the client stay on track?", "A clean scheduled plan plus an AI assistant that answers plan questions, so they message you less."],
    ],
  },
  {
    slug: "longevity",
    name: "Longevity & anti-aging",
    doctor: "For longevity & anti-aging clinics",
    headline: "Show them getting younger.",
    lead: "Biological age, body composition and biomarkers tracked over your protocol — the visible proof of progress that keeps clients on the program.",
    device: "biological-age tests, InBody, biomarker panels",
    importNote: "Upload bio-age and biomarker reports — and any bloodwork.",
    steps: [
      { title: "Upload the markers", body: "Biological-age results, biomarker panels and body-composition scans come in by PDF or CSV." },
      { title: "See the delta", body: "Biological vs chronological age, and each biomarker, shown as a trend the client can follow visit to visit." },
      { title: "Plan & track", body: "AI drafts the longevity plan you approve, and every retest shows the pace-of-aging and biomarkers moving the right way." },
    ],
    points: [
      "Biological-age delta tracked over the protocol",
      "Biomarkers and body composition trended together",
      "Visible proof that keeps clients renewing",
    ],
    shot: "be-records.png",
    faq: [
      ["Which bio-age tests?", "Epigenetic and panel-based results import by PDF; we track the score and its delta over time."],
      ["Can I combine it with wearables?", "Yes — VO2max, HRV and sleep data add to the longevity picture alongside labs."],
      ["Does the client see progress?", "Yes — their own app shows the trends and the plan, with an AI assistant for questions."],
    ],
  },
  {
    slug: "hormone-therapy",
    name: "Hormone therapy (HRT / TRT)",
    doctor: "For HRT & TRT clinics",
    headline: "Dose against the labs, automatically.",
    lead: "Hormone levels tracked against the protocol, with a client app that keeps them adherent and informed between blood draws.",
    device: "hormone labs, dosing protocols, body composition",
    importNote: "Upload hormone panels — and any bloodwork.",
    steps: [
      { title: "Set the protocol", body: "Build the HRT or TRT protocol with hormone, route, dose and frequency; log each administration." },
      { title: "See the levels", body: "Testosterone, estradiol, thyroid and more are trended against the dose, with out-of-range values flagged." },
      { title: "Plan & adjust", body: "AI drafts adjustments you approve; the client follows the plan and asks the AI, not you, between visits." },
    ],
    points: [
      "Dose-vs-hormone-level tracking over the program",
      "Out-of-range markers flagged on every panel",
      "Client app keeps adherence high between labs",
    ],
    shot: "be-plan-synthesis.png",
    faq: [
      ["Does it track injections?", "Yes — log administrations with dose, route, site and side effects, tied to the protocol."],
      ["Which labs?", "Standard hormone panels by PDF or CSV; values map to ranges and trend automatically."],
      ["What does the client get?", "A clean plan and an AI assistant that answers their questions about it."],
    ],
  },
  {
    slug: "chiropractic",
    name: "Chiropractic & posture",
    doctor: "For chiropractors & movement practitioners",
    headline: "From spine scan to a plan they follow.",
    lead: "Upload a spine or posture scan and alignment photos, and CHI turns them into a visual the client understands — then a care plan you both track adjustment to adjustment.",
    device: "spine / posture scanner, alignment photos",
    importNote: "Upload spine scans and alignment photos — and any bloodwork.",
    steps: [
      { title: "Upload the scan", body: "Drop in the spine or posture scan and before/after alignment photos — by file, no manual entry." },
      { title: "See the alignment", body: "The findings and photos become a clear visual the client can see — where things are off, and by how much." },
      { title: "Plan & track", body: "AI drafts a care plan you approve, and each visit tracks alignment and symptom changes over the course of care." },
    ],
    points: [
      "Spine / posture scans and alignment photos imported by file",
      "Before / after visuals the client actually understands",
      "Progress tracked adjustment to adjustment",
    ],
    shot: "",
    faq: [
      ["Do you support my scanner?", "Spine and posture scan reports and photos import today as files; a dedicated posture parser is on the roadmap."],
      ["Can I show before / after?", "Yes — alignment photos and findings sit side by side so progress is obvious to the client."],
      ["What does the client see?", "Their own visual, a simple plan, and an AI assistant for questions between visits."],
    ],
  },
  {
    slug: "plant-medicine",
    name: "Plant medicine & KAP",
    doctor: "For ketamine-assisted & plant-medicine practices",
    headline: "Screen, session, integrate — in one place.",
    lead: "Run screening, log sessions and capture integration notes, with a plan the client follows and progress tracked across the journey.",
    device: "screening labs, session logs, integration notes",
    importNote: "Upload screening labs — and any bloodwork.",
    steps: [
      { title: "Screen safely", body: "Capture screening per substance with a clear cleared / conditional / contraindicated result before anything proceeds." },
      { title: "Log the session", body: "Record each session — substance, dose, date and the client's rating — with optional integration notes after." },
      { title: "Plan & track", body: "AI drafts an integration plan you approve, and progress is tracked across the arc of care." },
    ],
    points: [
      "Per-substance screening with clear safety results",
      "Session and integration notes in one record",
      "Integration plan the client follows over time",
    ],
    shot: "be-records.png",
    faq: [
      ["Which substances?", "Ketamine, psilocybin, MDMA and others are supported with their own screening and session logging."],
      ["Is screening enforced?", "Screening results are captured up front so contraindications are visible before a session is logged."],
      ["What does the client get?", "An integration plan and an AI assistant for questions between sessions."],
    ],
  },
];

export function getVertical(slug: string): Vertical | undefined {
  return VERTICALS.find((v) => v.slug === slug);
}
