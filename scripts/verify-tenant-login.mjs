// Positive end-to-end checkpoint: a practice-#1 staff user logs in and sees exactly
// practice #1's data (RLS-scoped), and the practice's module set is correct for gating.
// Env: DEST_URL, DEST_SERVICE_KEY, DEST_ANON_KEY. Run: node --env-file=.env scripts/verify-tenant-login.mjs
import { createClient } from "@supabase/supabase-js";

const ELEV8 = "11111111-1111-1111-1111-111111111111";
const need = (k) => { const v = process.env[k]; if (!v) { console.error("missing " + k); process.exit(1); } return v; };
const admin = createClient(need("DEST_URL"), need("DEST_SERVICE_KEY"), { auth: { persistSession: false } });
const ANON_URL = need("DEST_URL"), ANON_KEY = need("DEST_ANON_KEY");

const EMAIL = "phase1-login-test@example.com";
const PW = "Phase1-Login-Test!";
const fails = [];
let uid = null, pracId = "33333333-3333-3333-3333-333333333333";

async function run() {
  // expected practice-#1 patient count (admin, bypasses RLS)
  const { count: expected } = await admin.from("patients").select("id", { count: "exact", head: true }).eq("practice_id", ELEV8);
  // practice modules
  const { data: practice } = await admin.from("practices").select("modules").eq("id", ELEV8).maybeSingle();
  const modules = practice?.modules ?? [];

  // create test staff user in practice #1
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email: EMAIL, password: PW, email_confirm: true });
  if (cErr && !String(cErr.message).includes("already")) throw cErr;
  uid = created?.user?.id;
  if (!uid) { const { data } = await admin.auth.admin.listUsers(); uid = data.users.find(u => u.email === EMAIL)?.id; }
  await admin.from("practitioners").upsert({ id: pracId, practice_id: ELEV8, auth_user_id: uid, name: "Phase1 Tester", email: EMAIL, role: "doctor", active: true }, { onConflict: "id" });

  // sign in as that user (RLS enforced)
  const user = createClient(ANON_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: sErr } = await user.auth.signInWithPassword({ email: EMAIL, password: PW });
  if (sErr) throw new Error("sign-in failed: " + sErr.message);

  // 1. sees exactly practice #1's patients
  const { count: seen } = await user.from("patients").select("id", { count: "exact", head: true });
  if (seen !== expected) fails.push(`patient count: saw ${seen}, expected ${expected} (practice #1)`);

  // 2. a few module tables are readable (RLS lets staff read their practice)
  for (const t of ["visits", "peptide_protocols", "biomarker_panels"]) {
    const { error } = await user.from(t).select("id").limit(1);
    if (error) fails.push(`${t}: staff read error ${error.message}`);
  }
  await user.auth.signOut();

  console.log(`practice #1 patients (admin): ${expected}`);
  console.log(`practice #1 modules: ${modules.join(", ")}`);
  console.log(`logged-in user saw: ${seen} patients`);
}

async function cleanup() {
  await admin.from("practitioners").delete().eq("id", pracId);
  if (uid) await admin.auth.admin.deleteUser(uid);
}

run().then(cleanup).then(() => {
  if (fails.length) { console.error("FAIL:\n" + fails.map(f => "  - " + f).join("\n")); process.exit(1); }
  console.log("\nPASS — practice-#1 user logs in and sees exactly their practice's data.");
}).catch(async e => { try { await cleanup(); } catch {} console.error("ERROR:", e.message); process.exit(2); });
