// ============================================================================
// HealthSync Cloud — Tenant Isolation Test (the Stage 1 LAUNCH GATE)
// ----------------------------------------------------------------------------
// Proves that a second practice cannot read ANY of practice #1's (Casa Elev8) data.
// This MUST pass green before any real second tenant is onboarded.
//
// What it does:
//   1. Creates a throwaway practice #2 + a staff auth user + practitioner row (service role).
//   2. Signs in AS that practice-#2 staff user (anon client, RLS enforced).
//   3. For every tenant table, SELECTs and asserts 0 rows belong to practice #1.
//   4. Forged-id probe: tries to read a known practice-#1 patient by id -> must get nothing.
//   5. Cleans up the throwaway practice #2 (cascades).
//
// Env required:
//   DEST_URL, DEST_SERVICE_KEY, DEST_ANON_KEY   (HealthSync Cloud)
//
// Run:  node scripts/test-tenant-isolation.mjs
// Exit code 0 = PASS (isolation holds). Non-zero = FAIL (do not launch).
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const ELEV8 = "11111111-1111-1111-1111-111111111111";
const P2 = "22222222-2222-2222-2222-222222222222";
const P2_EMAIL = `tenant-isolation-test+${P2.slice(0, 8)}@example.com`;
const P2_PASSWORD = "Test-Isolation-" + P2.slice(0, 8) + "!";

const need = (k) => { const v = process.env[k]; if (!v) { console.error(`Missing env ${k}`); process.exit(1); } return v; };
const admin = createClient(need("DEST_URL"), need("DEST_SERVICE_KEY"), { auth: { persistSession: false } });
const ANON_URL = need("DEST_URL");
const ANON_KEY = need("DEST_ANON_KEY");

// Every tenant table that holds practice-scoped rows.
const TENANT_TABLES = [
  "agreements", "appointments", "articles", "audit_logs", "audit_logs_ai",
  "body_composition", "body_map_findings", "data_requests", "email_log", "files",
  "health_data_imports", "intake_forms", "invoice_items", "invoices", "lab_results",
  "locations", "messages", "orders", "patient_insurance", "patient_labels",
  "patients", "payments", "plan_completions", "plan_items", "plan_phases",
  "plans", "practice_connectors", "practice_settings", "practitioners", "products",
  "progress_logs", "role_assignments", "scans", "services", "visits", "waitlist_entries",
];

let authUserId = null;
const fails = [];

async function setup() {
  // practice #2
  await admin.from("practices").upsert({
    id: P2, slug: "isolation-test", name: "Isolation Test Practice",
    plan: "starter", region: "us", modules: [],
  }, { onConflict: "id" });

  // staff auth user
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: P2_EMAIL, password: P2_PASSWORD, email_confirm: true,
  });
  if (cErr && !String(cErr.message).includes("already")) throw cErr;
  authUserId = created?.user?.id;
  if (!authUserId) {
    const { data: list } = await admin.auth.admin.listUsers();
    authUserId = list.users.find((u) => u.email === P2_EMAIL)?.id;
  }
  if (!authUserId) throw new Error("could not create/find test auth user");

  // practitioner row in practice #2 (doctor role -> broadest access within its practice)
  await admin.from("practitioners").upsert({
    id: P2, practice_id: P2, auth_user_id: authUserId,
    name: "Isolation Tester", email: P2_EMAIL, role: "doctor", active: true,
  }, { onConflict: "id" });
}

async function run() {
  await setup();

  // sign in as the practice-#2 staff user (RLS enforced via anon client + session)
  const user = createClient(ANON_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: sErr } = await user.auth.signInWithPassword({ email: P2_EMAIL, password: P2_PASSWORD });
  if (sErr) throw new Error(`sign-in failed: ${sErr.message}`);

  // 1. No practice-#1 rows visible in any tenant table.
  for (const t of TENANT_TABLES) {
    const { data, error } = await user.from(t).select("practice_id").eq("practice_id", ELEV8).limit(1);
    if (error) {
      // A clean RLS denial may surface as empty data, not an error; an actual error is itself a fail to investigate.
      fails.push(`${t}: query error ${error.message}`);
    } else if (data && data.length > 0) {
      fails.push(`${t}: LEAK — practice #2 staff can read practice #1 rows`);
    }
  }

  // 2. Forged-id probe: read a known practice-#1 patient directly by id.
  const { data: anyPt } = await admin.from("patients").select("id").eq("practice_id", ELEV8).limit(1);
  const victimId = anyPt?.[0]?.id;
  if (victimId) {
    const { data: leak } = await user.from("patients").select("id").eq("id", victimId).limit(1);
    if (leak && leak.length > 0) fails.push(`patients: LEAK — forged-id read of practice #1 patient ${victimId}`);
  }

  // 3. Sanity: practice #2 staff CAN see its own practice row (proves auth works, not just blanket-deny).
  const { data: own } = await user.from("practitioners").select("id").eq("practice_id", P2);
  if (!own || own.length === 0) fails.push("sanity: practice #2 staff cannot see its OWN practitioner row (over-blocking)");

  await user.auth.signOut();
}

async function cleanup() {
  await admin.from("practices").delete().eq("id", P2);          // cascades practitioner row
  if (authUserId) await admin.auth.admin.deleteUser(authUserId);
}

run()
  .then(cleanup)
  .then(() => {
    if (fails.length === 0) {
      console.log("PASS — tenant isolation holds. Practice #2 sees 0 rows of practice #1.");
      process.exit(0);
    }
    console.error("FAIL — tenant isolation breached:\n" + fails.map((f) => "  - " + f).join("\n"));
    process.exit(1);
  })
  .catch(async (e) => { try { await cleanup(); } catch {} console.error("ERROR:", e.message); process.exit(2); });
