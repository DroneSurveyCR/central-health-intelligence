// Single intake question set for everyone (captures sex; no gender-branching).
// Field set derived from the Elev8 intake (ELEV8-PATIENT-DATA.md §5 / fe-intake.html).

export type Field =
  | { id: string; label: string; type: "text" | "textarea" | "email" | "tel" | "date" | "number" }
  | { id: string; label: string; type: "select"; options: string[] }
  | { id: string; label: string; type: "slider"; min: number; max: number }
  | { id: string; label: string; type: "multi"; options: string[] };

export type Section = { id: string; title: string; fields: Field[] };

const YN = ["No", "Yes"];

export const INTAKE_SECTIONS: Section[] = [
  {
    id: "profile",
    title: "Your details",
    fields: [
      { id: "first_name", label: "First name", type: "text" },
      { id: "last_name", label: "Last name", type: "text" },
      { id: "sex", label: "Sex", type: "select", options: ["Female", "Male", "Other", "Prefer not to say"] },
      { id: "dob", label: "Date of birth", type: "date" },
      { id: "email", label: "Email", type: "email" },
      { id: "cell", label: "Mobile", type: "tel" },
      { id: "city", label: "City", type: "text" },
      { id: "occupation", label: "Occupation", type: "text" },
      { id: "referral_source", label: "How did you hear about us?", type: "text" },
      { id: "emergency_contact", label: "Emergency contact (name & relation)", type: "text" },
    ],
  },
  {
    id: "goals",
    title: "Goals & history",
    fields: [
      { id: "main_goals", label: "Your main health goals", type: "textarea" },
      { id: "diagnoses_5yr", label: "Diagnoses in the last 5 years", type: "textarea" },
      { id: "height", label: "Height", type: "text" },
      { id: "weight", label: "Weight", type: "text" },
      { id: "weight_goal", label: "Weight goal", type: "text" },
    ],
  },
  {
    id: "symptoms",
    title: "Symptoms",
    fields: [
      {
        id: "symptoms",
        label: "Which do you experience?",
        type: "multi",
        options: ["Fatigue", "Headaches", "Poor memory", "Chronic digestive issues", "Joint pain", "Mood swings", "Skin problems", "Shortness of breath"],
      },
      { id: "symptoms_began", label: "When did symptoms begin?", type: "text" },
      { id: "worse_with", label: "Symptoms are worse with…", type: "text" },
      { id: "better_with", label: "Symptoms are better with…", type: "text" },
    ],
  },
  {
    id: "history",
    title: "Health history",
    fields: [
      { id: "parasite_cleanse", label: "Done a parasite cleanse?", type: "select", options: YN },
      { id: "heavy_metal_detox", label: "Done a heavy-metal detox?", type: "select", options: YN },
      { id: "covid_vaccine_history", label: "COVID / vaccine history", type: "text" },
      { id: "dental_history", label: "Dental history (e.g. amalgam fillings)", type: "text" },
      { id: "mental_health", label: "Mental health", type: "text" },
      { id: "plant_medicine", label: "Open to plant medicine?", type: "select", options: ["Not sure", "Open / curious", "No"] },
    ],
  },
  {
    id: "complaint",
    title: "Area of complaint",
    fields: [
      {
        id: "body_regions",
        label: "Where do you feel it?",
        type: "multi",
        options: ["Head", "Neck", "Chest", "Abdomen", "Back", "Pelvis", "Arms", "Legs"],
      },
    ],
  },
  {
    id: "patterns",
    title: "Mind & body patterns",
    fields: [
      { id: "emotions", label: "Emotions", type: "multi", options: ["Worry", "Overthinking", "Anxiety", "Irritability", "Low mood", "Calm"] },
      { id: "sleep", label: "Sleep", type: "multi", options: ["Trouble falling asleep", "Wake during the night", "Wake exhausted", "Sleep well"] },
      { id: "digestion", label: "Digestion", type: "multi", options: ["Bloating/Gas", "Reflux", "Crave salt", "Crave sugar", "No issues"] },
      { id: "bowel", label: "Bowel", type: "multi", options: ["Constipation", "Loose", "Regular", "Lots of effort"] },
    ],
  },
  {
    id: "stress",
    title: "Stress",
    fields: [{ id: "stress_level", label: "Stress level (0–10)", type: "slider", min: 0, max: 10 }],
  },
  {
    id: "lifestyle",
    title: "Medications & lifestyle",
    fields: [
      { id: "medications", label: "Current medications", type: "textarea" },
      { id: "supplements", label: "Current supplements", type: "textarea" },
      { id: "health_routine", label: "Your health routine", type: "textarea" },
      { id: "surgeries", label: "Past surgeries", type: "text" },
      { id: "injuries", label: "Past injuries", type: "text" },
    ],
  },
  {
    id: "conditions",
    title: "Conditions",
    fields: [
      {
        id: "conditions",
        label: "Have you had any of these?",
        type: "multi",
        options: ["High Blood Pressure", "Headaches", "Poor Memory", "Poor Sleep", "Bloating/Gas", "Muscle Tension", "Cold Hands/Feet", "Diabetes", "Thyroid Disorder", "Allergies"],
      },
    ],
  },
  {
    id: "extras",
    title: "A few more",
    fields: [
      { id: "wellbeing_satisfaction", label: "Overall wellbeing satisfaction (0–10)", type: "slider", min: 0, max: 10 },
      { id: "urination_problems", label: "Urination problems?", type: "select", options: YN },
      { id: "low_back_pain", label: "Low back pain?", type: "select", options: YN },
      { id: "knee_pain", label: "Knee pain?", type: "select", options: YN },
      { id: "other_notes", label: "Anything else we should know?", type: "textarea" },
    ],
  },
];

export const INTAKE_STEP_COUNT = INTAKE_SECTIONS.length;
