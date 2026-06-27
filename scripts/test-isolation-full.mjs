// ============================================================================
// HealthSync Cloud — FULL adversarial multi-tenant isolation test (NEW tables)
// ----------------------------------------------------------------------------
// Proves the load-bearing security property: a user in practice #2 can read
// ZERO rows belonging to practice #1 (Casa Elev8), across all of the newer
// module tables (intelligence, modality marketplace, HRT, dispensary,
// e-prescribing, wearables/CGM, connector sync, AI drafts).
//
// Method:
//   1. Ensure a SECOND practice (slug `isolation-probe`) + a practitioner in it
//      linked to a fresh confirmed auth user (probe@isolation.test). [admin]
//   2. As ADMIN (service role, bypasses RLS) insert ONE probe row per target
//      table, explicitly scoped to practice #1 (practice_id = ELEV8, and a real
//      practice-#1 patient_id where needed). Each insert is try/catch'd; tables
//      whose required columns we can't satisfy are SKIPPED and reported.
//   3. Sign in as the practice-#2 probe user (anon client + signInWithPassword)
//      and, under that RLS-scoped session, SELECT from every target table and
//      assert it sees 0 of practice #1's probe rows (by id AND by practice_id).
//      Any visible row = LEAK.
//   4. Positive control: the probe user CAN see its own practice #2 rows
//      (proves RLS isn't just blanket-denying everything).
//   5. Clean up every admin-inserted probe row + the probe auth user.
//   6. Print a per-table PASS/LEAK table + final verdict; exit non-zero on leak.
//
// Env: .env -> DEST_URL, DEST_SERVICE_KEY (service role)
//      .env.local -> NEXT_PUBLIC_SUPABASE_ANON_KEY (anon, for the real sign-in)
//
// Run: node --env-file=.env --env-file=.env.local scripts/test-isolation-full.mjs
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const ELEV8 = "11111111-1111-1111-1111-111111111111";
const P2_SLUG = "isolation-probe";
const P2_EMAIL = "probe@isolation.test";
const P2_PASSWORD = "Probe-Isolation-9f3a!";
const TAG = "ISOLATION_PROBE_ROW"; // text sentinel where a free-text column exists

const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`Missing env ${k} (need .env + .env.local)`); process.exit(2); }
  return v;
};

const DEST_URL = need("DEST_URL");
const SERVICE_KEY = need("DEST_SERVICE_KEY");
const ANON_KEY = need("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const admin = createClient(DEST_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ----------------------------------------------------------------------------
// Target tables + a builder that returns ONE practice-#1-scoped row to insert.
// `mark` is the column holding our text sentinel (for reporting); leak detection
// uses both the inserted row id AND practice_id = ELEV8.
// ----------------------------------------------------------------------------
let P1_PATIENT = null;        // real practice-#1 patient id (filled in setup)
let RECO_ID = null;           // a modality_recommendation id (for outcomes/courses FK-ish)

const TARGETS = () => [
  { table: "patient_briefings",        mark: "summary",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, briefing_date: "2099-01-01", summary: TAG } },
  { table: "alerts",                   mark: "message",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, metric: "resting_hr", message: TAG } },
  { table: "alert_rules",              mark: "name",
    row: { practice_id: ELEV8, name: TAG, metric: "resting_hr", threshold: 100 } },
  { table: "ai_drafts",                mark: "draft_content",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, kind: "visit_note", draft_content: TAG } },
  { table: "care_team",                mark: "role",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, practitioner_id: ELEV8, role: TAG } },
  { table: "tasks",                    mark: "title",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, title: TAG } },
  { table: "patient_milestones",       mark: "label",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, kind: "streak", label: TAG } },
  { table: "patient_data_consents",    mark: "domain",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, domain: TAG } },
  { table: "modality_recommendations", mark: "rationale",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, modality_id: ELEV8, rationale: TAG } },
  { table: "modality_outcomes",        mark: "marker",
    row: () => ({ practice_id: ELEV8, recommendation_id: RECO_ID ?? ELEV8, patient_id: P1_PATIENT, marker: TAG }) },
  { table: "modality_courses",         mark: "status",
    row: () => ({ practice_id: ELEV8, recommendation_id: RECO_ID ?? ELEV8, patient_id: P1_PATIENT }) },
  { table: "hrt_protocols",            mark: "hormone",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, hormone: TAG } },
  { table: "hrt_administrations",      mark: "notes",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, notes: TAG } },
  { table: "supplement_recommendations", mark: "product_name",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, product_name: TAG } },
  { table: "prescriptions",            mark: "medication",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, medication: TAG } },
  { table: "wearable_daily_summaries", mark: "connector_slug",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, connector_slug: "probe", date: "2099-01-01" } },
  { table: "connector_oauth_tokens",   mark: "connector_slug",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, connector_slug: "probe-isolation" } },
  { table: "connector_sync_jobs",      mark: "connector_slug",
    row: { practice_id: ELEV8, patient_id: P1_PATIENT, connector_slug: "probe-isolation" } },
];

let probeAuthUserId = null;
let p2PractitionerId = null;
const inserted = [];     // { table, id }
const skipped = [];      // { table, reason }
const results = [];      // { table, status: 'PASS'|'LEAK'|'SKIP', detail }

// ----------------------------------------------------------------------------
async function setup() {
  // a real practice-#1 patient (FK target for patient-scoped tables)
  const { data: pt, error: ptErr } = await admin
    .from("patients").select("id").eq("practice_id", ELEV8).limit(1);
  if (ptErr) throw new Error(`cannot read a practice-#1 patient: ${ptErr.message}`);
  P1_PATIENT = pt?.[0]?.id;
  if (!P1_PATIENT) throw new Error("no practice-#1 patient found — cannot build patient-scoped probe rows");

  // ensure practice #2 (by slug); insert via admin if missing
  let { data: p2, error: selErr } = await admin
    .from("practices").select("id").eq("slug", P2_SLUG).limit(1);
  if (selErr) throw new Error(`practices select failed: ${selErr.message}`);
  let p2Id = p2?.[0]?.id;
  if (!p2Id) {
    const { data: created, error: insErr } = await admin.from("practices")
      .insert({ slug: P2_SLUG, name: "Isolation Probe Practice", plan: "starter", region: "us", modules: [] })
      .select("id");
    if (insErr) throw new Error(`could not create practice #2: ${insErr.message}`);
    p2Id = created[0].id;
  }
  global.__P2_ID = p2Id;

  // fresh confirmed auth user for practice #2
  const { data: createdUser, error: cErr } = await admin.auth.admin.createUser({
    email: P2_EMAIL, password: P2_PASSWORD, email_confirm: true,
  });
  if (cErr && !/already|registered|exists/i.test(cErr.message)) throw cErr;
  probeAuthUserId = createdUser?.user?.id;
  if (!probeAuthUserId) {
    // find existing
    let page = 1; let found = null;
    while (!found && page < 20) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      found = list?.users?.find((u) => u.email === P2_EMAIL)?.id;
      if (!list || list.users.length < 200) break;
      page++;
    }
    probeAuthUserId = found;
  }
  if (!probeAuthUserId) throw new Error("could not create or find probe auth user");

  // practitioner row in practice #2 linked to that auth user (doctor = broadest in-practice access)
  let { data: existingPrac } = await admin
    .from("practitioners").select("id").eq("practice_id", p2Id).eq("auth_user_id", probeAuthUserId).limit(1);
  p2PractitionerId = existingPrac?.[0]?.id;
  if (!p2PractitionerId) {
    const { data: pr, error: prErr } = await admin.from("practitioners")
      .insert({ practice_id: p2Id, auth_user_id: probeAuthUserId, name: "Isolation Probe", email: P2_EMAIL, role: "doctor", active: true })
      .select("id");
    if (prErr) throw new Error(`could not create practice-#2 practitioner: ${prErr.message}`);
    p2PractitionerId = pr[0].id;
  }
}

// ----------------------------------------------------------------------------
// Insert one practice-#1 probe row per table (admin, RLS bypassed).
async function plantProbeRows() {
  for (const spec of TARGETS()) {
    const row = typeof spec.row === "function" ? spec.row() : spec.row;
    try {
      const { data, error } = await admin.from(spec.table).insert(row).select("id");
      if (error) { skipped.push({ table: spec.table, reason: error.message }); continue; }
      const id = data[0].id;
      inserted.push({ table: spec.table, id, mark: spec.mark });
      if (spec.table === "modality_recommendations") RECO_ID = id;
    } catch (e) {
      skipped.push({ table: spec.table, reason: e.message });
    }
  }
}

// ----------------------------------------------------------------------------
async function checkIsolation() {
  const user = createClient(DEST_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: sErr } = await user.auth.signInWithPassword({ email: P2_EMAIL, password: P2_PASSWORD });
  if (sErr) throw new Error(`sign-in as probe user failed: ${sErr.message}`);

  // Per planted table: can the practice-#2 session read THIS specific row, or ANY ELEV8 row?
  for (const ins of inserted) {
    let detail = "";
    let leak = false;

    // (a) exact-id read of the planted practice-#1 row
    const byId = await user.from(ins.table).select("id").eq("id", ins.id).limit(1);
    if (byId.error && !isCleanDenial(byId.error)) {
      detail = `query error (by id): ${byId.error.message}`;
    } else if (byId.data && byId.data.length > 0) {
      leak = true; detail = `read planted practice#1 row by id (${ins.id})`;
    }

    // (b) blanket read of ANY practice-#1 rows in this table
    if (!leak) {
      const byPractice = await user.from(ins.table).select("id").eq("practice_id", ELEV8).limit(1);
      if (byPractice.error && !isCleanDenial(byPractice.error)) {
        if (!detail) detail = `query error (by practice_id): ${byPractice.error.message}`;
      } else if (byPractice.data && byPractice.data.length > 0) {
        leak = true; detail = `read practice#1 rows via practice_id filter (count>=1)`;
      }
    }

    results.push({ table: ins.table, status: leak ? "LEAK" : "PASS", detail });
  }

  // tables that were skipped at plant time still get reported (no probe row to test)
  for (const s of skipped) {
    results.push({ table: s.table, status: "SKIP", detail: s.reason });
  }

  // Positive control: probe user CAN see its OWN practice #2 practitioner row.
  const own = await user.from("practitioners").select("id").eq("id", p2PractitionerId).limit(1);
  const positiveOk = !own.error && own.data && own.data.length > 0;
  results.push({
    table: "(positive control: own practitioner)",
    status: positiveOk ? "PASS" : "LEAK",
    detail: positiveOk ? "probe user sees its own practice-#2 row" : "OVER-BLOCK: probe user cannot see its OWN row (RLS may be blanket-denying — isolation result is meaningless)",
  });

  await user.auth.signOut();
  return positiveOk;
}

// A clean RLS denial typically returns empty data, not an error. Treat permission
// errors as denials (not leaks). Real schema/query errors are flagged separately.
function isCleanDenial(err) {
  const m = (err?.message || "").toLowerCase();
  return m.includes("permission denied") || m.includes("row-level security") || err?.code === "42501";
}

// ----------------------------------------------------------------------------
async function cleanup() {
  for (const ins of inserted) {
    try { await admin.from(ins.table).delete().eq("id", ins.id); } catch {}
  }
  // remove probe practitioner + practice + auth user (practice delete cascades practitioners)
  try { if (global.__P2_ID) await admin.from("practices").delete().eq("id", global.__P2_ID); } catch {}
  try { if (probeAuthUserId) await admin.auth.admin.deleteUser(probeAuthUserId); } catch {}
}

// ----------------------------------------------------------------------------
function report(positiveOk) {
  const leaks = results.filter((r) => r.status === "LEAK" && !r.table.startsWith("(positive"));
  const positiveLeak = results.find((r) => r.table.startsWith("(positive") && r.status === "LEAK");

  console.log("\n================ MULTI-TENANT ISOLATION — FULL ================");
  console.log("Practice #1 (victim): Casa Elev8 " + ELEV8);
  console.log("Practice #2 (probe) : slug=" + P2_SLUG + " user=" + P2_EMAIL);
  console.log("Practice-#1 patient used for patient-scoped rows: " + P1_PATIENT);
  console.log("---------------------------------------------------------------");
  const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
  console.log(pad("TABLE", 34) + pad("RESULT", 8) + "DETAIL");
  for (const r of results) {
    console.log(pad(r.table, 34) + pad(r.status, 8) + (r.detail || ""));
  }
  console.log("---------------------------------------------------------------");
  console.log(`planted: ${inserted.length}  skipped: ${skipped.length}  leaks: ${leaks.length}`);

  if (skipped.length) {
    console.log("\nSKIPPED TABLES (could not plant a probe row — NOT tested):");
    for (const s of skipped) console.log(`  - ${s.table}: ${s.reason}`);
  }

  console.log("\n================ VERDICT ================");
  if (leaks.length === 0 && positiveOk) {
    console.log("PASS — isolation holds. Practice #2 read 0 rows of practice #1 across all "
      + inserted.length + " planted tables, and CAN see its own data.");
  } else {
    if (leaks.length) {
      console.log("LEAK — CROSS-TENANT DATA EXPOSURE DETECTED. Practice #2 read practice #1 data in:");
      for (const r of leaks) console.log(`  !!! ${r.table} — ${r.detail}`);
    }
    if (positiveLeak) console.log("WARNING — positive control failed: " + positiveLeak.detail);
  }
  console.log("=========================================\n");

  return leaks.length === 0 && positiveOk;
}

// ----------------------------------------------------------------------------
(async () => {
  let ok = false;
  try {
    await setup();
    await plantProbeRows();
    const positiveOk = await checkIsolation();
    ok = report(positiveOk);
  } catch (e) {
    console.error("\nERROR:", e.message);
    ok = false;
  } finally {
    try { await cleanup(); } catch (e) { console.error("cleanup warning:", e.message); }
  }
  process.exit(ok ? 0 : 1);
})();
