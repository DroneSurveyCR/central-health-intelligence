// HealthSync Cloud — seed GLOBAL modalities (practice_id = null) for the
// Modality Marketplace (Part 10). Idempotent: skips any global modality whose
// name already exists. Run with:
//   DEST_URL=... DEST_SERVICE_KEY=... node scripts/seed-modalities.mjs
//
// These are intra-clinic menu entries. Nothing here is an efficacy CLAIM —
// indications/target_markers describe what a clinic MIGHT observe, and every
// modality carries an evidence_level so the UI can frame it honestly.

import { createClient } from "@supabase/supabase-js";

const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error("missing env " + k);
    process.exit(1);
  }
  return v;
};

const admin = createClient(need("DEST_URL"), need("DEST_SERVICE_KEY"), {
  auth: { persistSession: false },
});

/** ~12 global modalities across categories. */
const MODALITIES = [
  {
    name: "Rife Frequency Therapy",
    category: "energy",
    indications: ["general wellness", "stress", "fatigue"],
    target_markers: ["HRV", "perceived energy", "sleep quality"],
    evidence_level: "emerging",
    contraindications: ["pregnancy", "implanted electronic devices (e.g. pacemaker)", "active seizure disorder"],
    typical_cost: 90,
    typical_duration: "30–45 min/session",
  },
  {
    name: "PEMF (Pulsed Electromagnetic Field)",
    category: "energy",
    indications: ["recovery", "joint discomfort", "sleep"],
    target_markers: ["HRV", "recovery score", "pain (self-rated)"],
    evidence_level: "observational",
    contraindications: ["pregnancy", "implanted electronic devices", "active hemorrhage"],
    typical_cost: 75,
    typical_duration: "20–30 min/session",
  },
  {
    name: "Red Light / Photobiomodulation",
    category: "energy",
    indications: ["skin health", "recovery", "mood"],
    target_markers: ["recovery score", "skin (self-rated)", "mood (self-rated)"],
    evidence_level: "established",
    contraindications: ["photosensitizing medication", "active skin malignancy", "pregnancy (abdominal exposure)"],
    typical_cost: 60,
    typical_duration: "10–20 min/session",
  },
  {
    name: "IV Vitamin Infusion",
    category: "infusion",
    indications: ["fatigue", "immune support", "hydration"],
    target_markers: ["perceived energy", "vitamin D", "ferritin"],
    evidence_level: "observational",
    contraindications: ["renal impairment", "G6PD deficiency (high-dose vitamin C)", "fluid-overload conditions"],
    typical_cost: 175,
    typical_duration: "45–60 min/session",
  },
  {
    name: "NAD+ Infusion",
    category: "infusion",
    indications: ["fatigue", "cognitive clarity", "recovery"],
    target_markers: ["perceived energy", "cognition (self-rated)", "HRV"],
    evidence_level: "emerging",
    contraindications: ["pregnancy", "active cardiovascular instability", "severe hepatic impairment"],
    typical_cost: 350,
    typical_duration: "2–4 hr/session",
  },
  {
    name: "Ozone (Major Autohemotherapy)",
    category: "infusion",
    indications: ["immune support", "inflammation", "fatigue"],
    target_markers: ["CRP", "perceived energy", "white cell count"],
    evidence_level: "emerging",
    contraindications: ["G6PD deficiency", "hyperthyroidism", "pregnancy", "recent myocardial infarction"],
    typical_cost: 200,
    typical_duration: "45–60 min/session",
  },
  {
    name: "BPC-157 Peptide Course",
    category: "peptide",
    indications: ["tissue recovery", "gut comfort", "joint discomfort"],
    target_markers: ["pain (self-rated)", "recovery score", "GI symptoms (self-rated)"],
    evidence_level: "emerging",
    contraindications: ["active malignancy", "pregnancy", "uncharacterized lesions"],
    typical_cost: 120,
    typical_duration: "4–8 week course",
  },
  {
    name: "PRP (Platelet-Rich Plasma)",
    category: "regenerative",
    indications: ["joint discomfort", "tissue recovery", "skin/hair"],
    target_markers: ["pain (self-rated)", "range of motion", "recovery score"],
    evidence_level: "established",
    contraindications: ["active infection at site", "platelet dysfunction", "anticoagulant therapy", "active malignancy"],
    typical_cost: 600,
    typical_duration: "single procedure + follow-up",
  },
  {
    name: "Infrared Sauna",
    category: "thermal",
    indications: ["recovery", "relaxation", "sleep"],
    target_markers: ["HRV", "sleep quality", "resting heart rate"],
    evidence_level: "observational",
    contraindications: ["pregnancy", "uncontrolled hypertension", "recent cardiac event", "dehydration"],
    typical_cost: 45,
    typical_duration: "20–40 min/session",
  },
  {
    name: "Whole-Body Cryotherapy",
    category: "thermal",
    indications: ["recovery", "inflammation", "mood"],
    target_markers: ["CRP", "recovery score", "mood (self-rated)"],
    evidence_level: "observational",
    contraindications: ["pregnancy", "cold hypersensitivity / cryoglobulinemia", "uncontrolled hypertension", "Raynaud's"],
    typical_cost: 50,
    typical_duration: "2–4 min/session",
  },
  {
    name: "Glutathione Detox Protocol",
    category: "detox",
    indications: ["oxidative stress", "skin health", "fatigue"],
    target_markers: ["CRP", "perceived energy", "skin (self-rated)"],
    evidence_level: "emerging",
    contraindications: ["sulfa sensitivity", "asthma (inhaled forms)", "pregnancy"],
    typical_cost: 110,
    typical_duration: "30 min/session",
  },
  {
    name: "Lymphatic Bodywork / Manual Drainage",
    category: "bodywork",
    indications: ["recovery", "swelling/fluid", "relaxation"],
    target_markers: ["swelling (self-rated)", "HRV", "sleep quality"],
    evidence_level: "observational",
    contraindications: ["active infection", "acute DVT", "decompensated heart failure", "active malignancy (untreated)"],
    typical_cost: 95,
    typical_duration: "60 min/session",
  },
  {
    name: "Ketamine-Assisted Therapy",
    category: "plant-medicine",
    indications: ["mood", "stress resilience", "integration support"],
    target_markers: ["mood (self-rated)", "PHQ-9", "sleep quality"],
    evidence_level: "established",
    contraindications: ["uncontrolled hypertension", "active psychosis", "pregnancy", "severe hepatic impairment"],
    typical_cost: 400,
    typical_duration: "60–90 min/session",
  },
  {
    name: "Targeted Nutraceutical Stack",
    category: "nutraceutical",
    indications: ["general wellness", "sleep", "metabolic support"],
    target_markers: ["sleep quality", "fasting glucose", "perceived energy"],
    evidence_level: "observational",
    contraindications: ["drug–supplement interactions (review meds)", "pregnancy", "scheduled surgery (review bleeding-risk agents)"],
    typical_cost: 65,
    typical_duration: "ongoing, monthly review",
  },
];

async function main() {
  const { data: existing, error: selErr } = await admin
    .from("modalities")
    .select("name")
    .is("practice_id", null);

  if (selErr) {
    console.error("could not read existing global modalities:", selErr.message);
    process.exit(1);
  }

  const have = new Set((existing ?? []).map((m) => m.name));
  const toInsert = MODALITIES.filter((m) => !have.has(m.name));

  if (toInsert.length === 0) {
    console.log(
      `All ${MODALITIES.length} global modalities already present — nothing to do.`,
    );
    return;
  }

  const rows = toInsert.map((m) => ({ ...m, practice_id: null }));
  const { error: insErr } = await admin.from("modalities").insert(rows);
  if (insErr) {
    console.error("insert failed:", insErr.message);
    process.exit(1);
  }

  console.log(
    `Seeded ${rows.length} new global modalities (skipped ${MODALITIES.length - rows.length} already present).`,
  );
  for (const r of rows) console.log("  + " + r.name + "  [" + r.category + "]");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
