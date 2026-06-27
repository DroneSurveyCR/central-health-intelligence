// Prove the patient AI assistant works end-to-end on the live app: mint a patient
// login into Casa Elev8, sign in for a real session, and POST /api/assistant with
// the @supabase/ssr session cookie. Run: node --env-file=.env --env-file=.env.local scripts/test-assistant.mjs
import { createClient } from "@supabase/supabase-js";

const ELEV8 = "11111111-1111-1111-1111-111111111111";
const REF = "aezudceznxclvexfpdvr";
const BASE = process.env.PROVE_BASE_URL || "https://healthsync-cloud-mu.vercel.app";
const admin = createClient(process.env.DEST_URL, process.env.DEST_SERVICE_KEY, { auth: { persistSession: false } });

const { data: patient } = await admin
  .from("patients").select("id, first_name, last_name, email").eq("practice_id", ELEV8)
  .is("deleted_at", null).order("created_at").limit(1).maybeSingle();
const email = (patient.email && patient.email.includes("@")) ? patient.email.toLowerCase() : `patient.${patient.id.slice(0, 8)}@elev8.health`;
const PW = "Patient-Demo-2026!";
console.log("patient:", patient.first_name, patient.last_name, "->", email);

// create or update the auth user, link to the patient row
let uid;
const { data: c, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
if (error && String(error.message).includes("already")) {
  const { data } = await admin.auth.admin.listUsers();
  uid = data.users.find((u) => u.email === email)?.id;
  if (uid) await admin.auth.admin.updateUserById(uid, { password: PW });
} else uid = c?.user?.id;
await admin.from("patients").update({ auth_user_id: uid }).eq("id", patient.id);

// sign in for a real session
const pub = createClient(process.env.DEST_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data: si, error: se } = await pub.auth.signInWithPassword({ email, password: PW });
if (se) { console.log("sign-in failed:", se.message); process.exit(1); }

// build the @supabase/ssr cookie (chunked at 3180 like the library)
const cookieVal = "base64-" + Buffer.from(JSON.stringify(si.session)).toString("base64");
const name = `sb-${REF}-auth-token`;
const CHUNK = 3180;
const parts = cookieVal.length <= CHUNK
  ? [[name, cookieVal]]
  : Array.from({ length: Math.ceil(cookieVal.length / CHUNK) }, (_, j) => [`${name}.${j}`, cookieVal.slice(j * CHUNK, j * CHUNK + CHUNK)]);
const cookieHeader = parts.map(([n, v]) => `${n}=${v}`).join("; ");

const res = await fetch(`${BASE}/api/assistant`, {
  method: "POST",
  headers: { "content-type": "application/json", Cookie: cookieHeader },
  body: JSON.stringify({ message: "In one sentence, what is HRV and why does my care team track it?" }),
});
const body = await res.json().catch(() => ({}));
console.log("\n/api/assistant ->", res.status);
console.log("aiEnabled:", body.aiEnabled, "| crisis:", body.crisis ?? false);
console.log("reply:", (body.reply || JSON.stringify(body)).slice(0, 400));
console.log("\nPATIENT LOGIN  ->  " + email + "  /  " + PW);
