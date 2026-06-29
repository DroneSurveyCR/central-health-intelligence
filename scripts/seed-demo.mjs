// CHI public demo tenant seed — idempotent, run with: node --env-file=.env scripts/seed-demo.mjs
import { createClient } from "@supabase/supabase-js";

const PRACTICE_ID = "22222222-2222-2222-2222-222222222222";
const DEMO_EMAIL = "demo@chi.health";
const DEMO_PW = "CHI-Demo-2026!";
const TODAY = new Date().toISOString().slice(0, 10);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── Practice ─────────────────────────────────────────────────────────────────

const { data: existing } = await admin
  .from("practices")
  .select("id")
  .eq("slug", "chi-demo")
  .maybeSingle();

if (existing) {
  console.log("Demo already seeded — refreshing practitioner password");
  const { data: users } = await admin.auth.admin.listUsers();
  const u = users?.users?.find((u) => u.email === DEMO_EMAIL);
  if (u) await admin.auth.admin.updateUserById(u.id, { password: DEMO_PW });
  printSummary();
  process.exit(0);
}

const { error: pErr } = await admin.from("practices").insert({
  id: PRACTICE_ID,
  slug: "chi-demo",
  name: "Central Health Intelligence Demo",
  plan: "network",
  vertical: "longevity",
  region: "us",
  modules: [
    "scheduling", "billing", "portal", "labs",
    "wearables", "peptide", "longevity", "engagement", "marketplace",
  ],
  settings: {},
});
if (pErr) throw new Error("practices insert: " + pErr.message);

// ── Practitioner auth + row ───────────────────────────────────────────────────

let demoUid;
const { data: created, error: authErr } = await admin.auth.admin.createUser({
  email: DEMO_EMAIL,
  password: DEMO_PW,
  email_confirm: true,
});
if (authErr && String(authErr.message).includes("already")) {
  const { data: lu } = await admin.auth.admin.listUsers();
  const found = lu?.users?.find((u) => u.email === DEMO_EMAIL);
  demoUid = found?.id;
  if (demoUid) await admin.auth.admin.updateUserById(demoUid, { password: DEMO_PW });
} else {
  demoUid = created?.user?.id;
}
if (!demoUid) throw new Error("Could not resolve demo auth user");

const { error: prErr } = await admin.from("practitioners").insert({
  practice_id: PRACTICE_ID,
  auth_user_id: demoUid,
  name: "Dr. Alex Chen",
  email: DEMO_EMAIL,
  role: "doctor",
  active: true,
});
if (prErr && !prErr.message.includes("duplicate")) throw new Error("practitioners insert: " + prErr.message);

// ── Patients ──────────────────────────────────────────────────────────────────

const PATIENTS = [
  { id: "bbbbbbbb-0000-0000-0000-000000000001", first_name: "Ken",   last_name: "Patterson", sex: "male",   dob: "1967-04-12" },
  { id: "bbbbbbbb-0000-0000-0000-000000000002", first_name: "Maria", last_name: "Santos",    sex: "female", dob: "1972-09-23" },
  { id: "bbbbbbbb-0000-0000-0000-000000000003", first_name: "David", last_name: "Lee",       sex: "male",   dob: "1980-06-15" },
  { id: "bbbbbbbb-0000-0000-0000-000000000004", first_name: "Sarah", last_name: "Chen",      sex: "female", dob: "1985-11-02" },
  { id: "bbbbbbbb-0000-0000-0000-000000000005", first_name: "James", last_name: "Okafor",    sex: "male",   dob: "1990-03-28" },
  { id: "bbbbbbbb-0000-0000-0000-000000000006", first_name: "Ellen", last_name: "Burke",     sex: "female", dob: "1955-07-08" },
];

const patientRows = PATIENTS.map((p) => ({
  ...p,
  practice_id: PRACTICE_ID,
  email: `${p.first_name.toLowerCase()}.${p.last_name.toLowerCase()}@chi-demo.health`,
}));

const { error: ptErr } = await admin
  .from("patients")
  .upsert(patientRows, { onConflict: "id", ignoreDuplicates: false });
if (ptErr) throw new Error("patients upsert: " + ptErr.message);

// ── Wearable helpers ──────────────────────────────────────────────────────────

function datesBefore(endDate, n) {
  const result = [];
  const end = new Date(endDate);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function wave(i, n, amp) { return Math.sin((i / n) * Math.PI * 2) * amp; }

const dates = datesBefore(TODAY, 30);

function buildWearableRows(patientId, connector, dayFn) {
  return dates.map((date, i) => ({
    patient_id: patientId,
    connector_slug: connector,
    date,
    ...dayFn(i, dates.length),
  }));
}

const KEN = "bbbbbbbb-0000-0000-0000-000000000001";
const MARIA = "bbbbbbbb-0000-0000-0000-000000000002";
const DAVID = "bbbbbbbb-0000-0000-0000-000000000003";
const SARAH = "bbbbbbbb-0000-0000-0000-000000000004";
const JAMES = "bbbbbbbb-0000-0000-0000-000000000005";
const ELLEN = "bbbbbbbb-0000-0000-0000-000000000006";

const wearableRows = [
  // Ken — oura (sleep trending down last 11 days)
  ...buildWearableRows(KEN, "oura", (i, n) => {
    const trendFactor = i >= 19 ? lerp(0, 1, (i - 19) / 10) : 0;
    const sleepHours = parseFloat((lerp(7.5, 5.5, trendFactor) + wave(i, n, 0.3)).toFixed(1));
    const hrv = Math.round(lerp(55, 38, trendFactor) + wave(i, n, 3));
    const rhr = Math.round(lerp(60, 72, trendFactor) + wave(i, n, 2));
    return { sleep_hours: sleepHours, hrv_ms: hrv, resting_hr: rhr };
  }),

  // Ken — dexcom (glucose trending down)
  ...buildWearableRows(KEN, "dexcom", (i, n) => {
    const trendFactor = i / (n - 1);
    const glucose = parseFloat((lerp(115, 145, trendFactor) + wave(i, n, 5)).toFixed(1));
    const tir = parseFloat((lerp(82, 58, trendFactor) + wave(i, n, 3)).toFixed(1));
    return { avg_glucose_mgdl: glucose, time_in_range_pct: tir };
  }),

  // Maria — withings (weight & body fat)
  ...buildWearableRows(MARIA, "withings", (i, n) => ({
    weight_kg: parseFloat((lerp(68, 70, i / (n - 1)) + wave(i, n, 0.4)).toFixed(1)),
    body_fat_pct: parseFloat((lerp(28, 30, i / (n - 1)) + wave(i, n, 0.5)).toFixed(1)),
  })),

  // David — garmin (steps + HR)
  ...buildWearableRows(DAVID, "garmin", (i, n) => ({
    steps: Math.round(lerp(6000, 12000, 0.5 + wave(i, n, 0.5))),
    resting_hr: Math.round(lerp(58, 68, 0.5) + wave(i, n, 3)),
  })),

  // David — withings (weight plateau)
  ...buildWearableRows(DAVID, "withings", (i, n) => ({
    weight_kg: parseFloat((lerp(95, 98, 0.5) + wave(i, n, 0.6)).toFixed(1)),
  })),

  // Sarah — oura (good sleep, improving HRV)
  ...buildWearableRows(SARAH, "oura", (i, n) => ({
    sleep_hours: parseFloat((lerp(6, 8, i / (n - 1)) + wave(i, n, 0.3)).toFixed(1)),
    hrv_ms: Math.round(lerp(45, 65, i / (n - 1)) + wave(i, n, 4)),
  })),

  // James — garmin (athlete)
  ...buildWearableRows(JAMES, "garmin", (i, n) => {
    const overtrain = i >= 22 ? lerp(0, 1, (i - 22) / 7) : 0;
    return {
      steps: Math.round(lerp(10000, 18000, 0.5 + wave(i, n, 0.5))),
      hrv_ms: Math.round(lerp(85, 60, overtrain) + wave(i, n, 5)),
      resting_hr: Math.round(lerp(48, 58, overtrain) + wave(i, n, 2)),
    };
  }),

  // Ellen — apple_health (gentle activity)
  ...buildWearableRows(ELLEN, "apple_health", (i, n) => ({
    steps: Math.round(lerp(4000, 7000, 0.5 + wave(i, n, 0.4))),
    resting_hr: Math.round(lerp(65, 78, 0.5) + wave(i, n, 3)),
  })),
];

const { error: wErr } = await admin
  .from("wearable_daily_summaries")
  .upsert(wearableRows, { onConflict: "patient_id,connector_slug,date", ignoreDuplicates: false });
if (wErr) throw new Error("wearable_daily_summaries upsert: " + wErr.message);

// ── Briefings ─────────────────────────────────────────────────────────────────

const briefings = [
  {
    practice_id: PRACTICE_ID,
    patient_id: KEN,
    briefing_date: TODAY,
    summary: "Ken shows a clear 11-day sleep regression averaging -1.4 h/night alongside rising glucose and declining time-in-range, with resting HR up 9 bpm. Patterns are consistent with compounding metabolic stress.",
    deltas: [
      { metric: "Sleep", value: "-1.4 h/night", direction: "down" },
      { metric: "Resting HR", value: "+9 bpm", direction: "up" },
      { metric: "Glucose, time in range", value: "-12%", direction: "down" },
    ],
    talking_points: [
      "Sleep regression correlating with glucose elevation — review stress markers",
      "Consider CGM review at today's visit",
      "HRV trending down — may indicate recovery deficit",
    ],
  },
  {
    practice_id: PRACTICE_ID,
    patient_id: MARIA,
    briefing_date: TODAY,
    summary: "Maria's weight has crept up 2 kg over the month with a parallel rise in body fat percentage, suggesting possible estrogen-related metabolic shift. Hormone panel from last visit warrants re-evaluation.",
    deltas: [
      { metric: "Weight", value: "+2 kg", direction: "up" },
      { metric: "Body fat", value: "+2%", direction: "up" },
    ],
    talking_points: [
      "Weight gain pattern consistent with estrogen decline — revisit HRT dose",
      "Discuss dietary protein target to preserve lean mass",
      "Schedule DEXA follow-up in 60 days to track composition shift",
    ],
  },
  {
    practice_id: PRACTICE_ID,
    patient_id: DAVID,
    briefing_date: TODAY,
    summary: "David's weight has plateaued near 97 kg for three weeks despite consistent step counts, which may indicate GLP-1 dose needs titration or dietary adherence drift.",
    deltas: [
      { metric: "Weight", value: "plateaued at 97 kg", direction: "flat" },
      { metric: "Steps", value: "9,200/day avg", direction: "flat" },
    ],
    talking_points: [
      "Weight plateau after strong initial loss — evaluate GLP-1 titration",
      "Step count is consistent; rule out caloric creep before adjusting medication",
      "Check in on appetite and satiety signals at today's visit",
    ],
  },
  {
    practice_id: PRACTICE_ID,
    patient_id: SARAH,
    briefing_date: TODAY,
    summary: "Sarah's HRV has risen 20 ms and sleep duration extended by nearly 2 hours over the past 30 days, consistent with iron repletion improving aerobic recovery. Ferritin recheck recommended.",
    deltas: [
      { metric: "HRV", value: "+20 ms", direction: "up" },
      { metric: "Sleep duration", value: "+1.8 h/night", direction: "up" },
    ],
    talking_points: [
      "HRV and sleep improvements align with iron supplementation timeline",
      "Order ferritin to confirm repletion before tapering iron dose",
      "Consider introducing VO2max testing now that recovery markers are stabilizing",
    ],
  },
  {
    practice_id: PRACTICE_ID,
    patient_id: JAMES,
    briefing_date: TODAY,
    summary: "James's HRV has dropped 25 ms over the last 8 days despite his usual high step count, flagging possible overtraining or under-recovery entering a heavy training block.",
    deltas: [
      { metric: "HRV", value: "-25 ms over 8 days", direction: "down" },
      { metric: "Resting HR", value: "+10 bpm", direction: "up" },
    ],
    talking_points: [
      "HRV dip + resting HR rise — classic overtraining signature",
      "Recommend 48–72 h active recovery before next intense session",
      "Review sleep and nutrition timing; check cortisol if pattern persists",
    ],
  },
  {
    practice_id: PRACTICE_ID,
    patient_id: ELLEN,
    briefing_date: TODAY,
    summary: "Ellen has made steady year-over-year improvements across four key longevity markers: step count, resting HR, sleep consistency, and self-reported energy. Her trajectory is a strong outlier for her age cohort.",
    deltas: [
      { metric: "Steps vs last year", value: "+1,800/day", direction: "up" },
      { metric: "Resting HR vs last year", value: "-4 bpm", direction: "up" },
      { metric: "Sleep consistency", value: "improved", direction: "up" },
      { metric: "Self-reported energy", value: "improved", direction: "up" },
    ],
    talking_points: [
      "Four consecutive improvements — acknowledge progress and reinforce behaviours",
      "Consider adding balance and resistance training to protect fall risk",
      "VO2max estimate trending positive — document for longitudinal comparison",
    ],
  },
];

const { error: bErr } = await admin
  .from("patient_briefings")
  .upsert(briefings, { onConflict: "patient_id,briefing_date", ignoreDuplicates: false });
if (bErr) throw new Error("patient_briefings upsert: " + bErr.message);

// ── AI Drafts ─────────────────────────────────────────────────────────────────

const drafts = [
  // Ken — 2 × soap
  {
    practice_id: PRACTICE_ID, patient_id: KEN, kind: "soap", status: "pending", model: "gpt-4o",
    content: "S: Patient reports poor sleep over the past two weeks and increased fatigue. O: CGM data shows TIR declining to 62%, resting HR elevated at 71 bpm, HRV 40 ms. A: Sleep-driven metabolic dysregulation, possible early insulin resistance progression. P: Order cortisol panel, adjust sleep hygiene protocol, reassess CGM targets.",
  },
  {
    practice_id: PRACTICE_ID, patient_id: KEN, kind: "soap", status: "pending", model: "gpt-4o",
    content: "S: Follow-up on glucose management. Patient notes increased stress at work correlating with poorer readings. O: 30-day Dexcom trend shows avg glucose 138 mg/dL with TIR at 64%. A: Stress-mediated cortisol spikes likely contributing to postprandial excursions. P: Introduce post-meal walks, consider short-term berberine trial, recheck in 4 weeks.",
  },
  // Maria — message_reply
  {
    practice_id: PRACTICE_ID, patient_id: MARIA, kind: "message_reply", status: "pending", model: "gpt-4o",
    content: "Hi Maria — your recent data shows a modest uptick in weight and body fat that's worth discussing at your next visit. This pattern can sometimes reflect hormonal shifts, so I'd like to revisit your HRT protocol and run an updated panel. Nothing alarming, but let's be proactive.",
  },
  {
    practice_id: PRACTICE_ID, patient_id: MARIA, kind: "message_reply", status: "pending", model: "gpt-4o",
    content: "Thanks for sending in your Withings data — your consistency with daily weigh-ins is excellent and gives us great longitudinal signal. I've flagged the upward body fat trend for our next appointment and we'll review your protein intake and estrogen levels together.",
  },
  // David — message_reply
  {
    practice_id: PRACTICE_ID, patient_id: DAVID, kind: "message_reply", status: "pending", model: "gpt-4o",
    content: "David, your step count looks great — you're averaging over 9,000 steps a day consistently. The weight plateau is normal at this stage of GLP-1 therapy; let's talk at your next visit about whether a dose adjustment makes sense or whether a dietary recalibration is the better move first.",
  },
  {
    practice_id: PRACTICE_ID, patient_id: DAVID, kind: "message_reply", status: "pending", model: "gpt-4o",
    content: "Quick note: I reviewed your last 30 days of Withings and Garmin data ahead of our appointment. Your activity is solid and I'm not concerned about the plateau yet — sometimes the body needs a few weeks to recalibrate after rapid loss. We'll dig into it Thursday.",
  },
  // Sarah — message_reply
  {
    practice_id: PRACTICE_ID, patient_id: SARAH, kind: "message_reply", status: "pending", model: "gpt-4o",
    content: "Sarah, your Oura data is really encouraging — HRV up 20 ms and sleep consistently above 7 hours for the past two weeks. This aligns perfectly with the iron supplementation timeline, and it's great to see the recovery metrics responding. I'll order a ferritin check before your next visit.",
  },
  {
    practice_id: PRACTICE_ID, patient_id: SARAH, kind: "message_reply", status: "pending", model: "gpt-4o",
    content: "Just a heads-up that I've reviewed your wearable trends and the improvement in sleep and HRV is notable. If this continues, we can start talking about introducing a structured VO2max testing protocol — your aerobic base looks like it's coming back online.",
  },
  // James — message_reply
  {
    practice_id: PRACTICE_ID, patient_id: JAMES, kind: "message_reply", status: "pending", model: "gpt-4o",
    content: "James — your Garmin data flagged something I want you to be aware of: your HRV has dropped about 25 ms over the past 8 days and resting HR is up 10 bpm. This is a classic overtraining signal. I'd recommend pulling back intensity for 48–72 hours and prioritising sleep and nutrition before your next hard session.",
  },
  {
    practice_id: PRACTICE_ID, patient_id: JAMES, kind: "message_reply", status: "pending", model: "gpt-4o",
    content: "Following up on the HRV dip — how have you been feeling energy-wise? Sometimes this pattern comes from life stress as much as training load. Let me know if anything's changed outside the gym and we can decide together whether to run a cortisol panel.",
  },
  // Ellen — message_reply
  {
    practice_id: PRACTICE_ID, patient_id: ELLEN, kind: "message_reply", status: "pending", model: "gpt-4o",
    content: "Ellen, I want to take a moment to acknowledge how well you're doing — your year-over-year numbers across steps, resting HR, and sleep are genuinely impressive for any age group, let alone your cohort. Whatever you're doing is working, and I want to make sure we keep building on it.",
  },
  {
    practice_id: PRACTICE_ID, patient_id: ELLEN, kind: "message_reply", status: "pending", model: "gpt-4o",
    content: "At your next visit I'd love to add a balance and resistance assessment to your protocol — your cardiovascular markers are trending so well that it makes sense to layer in fall-risk prevention and muscle preservation. This is preventive medicine at its best.",
  },
];

const { error: dErr } = await admin.from("ai_drafts").insert(drafts);
if (dErr && !dErr.message.includes("duplicate")) throw new Error("ai_drafts insert: " + dErr.message);

// ── Connector OAuth Tokens ────────────────────────────────────────────────────

const connectors = [
  { patient_id: KEN,   connector_slug: "oura" },
  { patient_id: KEN,   connector_slug: "dexcom" },
  { patient_id: MARIA, connector_slug: "withings" },
  { patient_id: DAVID, connector_slug: "garmin" },
  { patient_id: DAVID, connector_slug: "withings" },
  { patient_id: SARAH, connector_slug: "oura" },
  { patient_id: JAMES, connector_slug: "garmin" },
  { patient_id: ELLEN, connector_slug: "apple_health" },
];

const tokenRows = connectors.map((c) => ({
  ...c,
  access_token: "demo-token",
  status: "connected",
}));

const { error: tErr } = await admin
  .from("connector_oauth_tokens")
  .upsert(tokenRows, { onConflict: "patient_id,connector_slug", ignoreDuplicates: false });
if (tErr) throw new Error("connector_oauth_tokens upsert: " + tErr.message);

// ── Summary ───────────────────────────────────────────────────────────────────

function printSummary() {
  console.log(`
=== CHI Demo Seeded ===
Practice: Central Health Intelligence Demo (chi-demo)
Patients: 6
Wearable days: ~240 rows

DEMO LOGIN (Staff)
  URL:   /login
  Email: ${DEMO_EMAIL}
  Pass:  ${DEMO_PW}

AUTO-LOGIN
  GET /api/demo  →  signs in as demo practitioner
`);
}

printSummary();
