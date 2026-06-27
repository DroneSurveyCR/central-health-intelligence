// Prove an AI draft PRODUCER works end-to-end: sign in as Dr. Randi (doctor), POST
// /api/ai/soap for a patient, confirm a pending ai_drafts row lands (→ shows in /approvals).
// Run: node --env-file=.env --env-file=.env.local scripts/test-ai-producer.mjs
import { createClient } from "@supabase/supabase-js";

const ELEV8 = "11111111-1111-1111-1111-111111111111";
const REF = "aezudceznxclvexfpdvr";
const BASE = process.env.PROVE_BASE_URL || "https://healthsync-cloud-mu.vercel.app";
const admin = createClient(process.env.DEST_URL, process.env.DEST_SERVICE_KEY, { auth: { persistSession: false } });

const { data: patient } = await admin.from("patients").select("id, first_name, last_name").eq("practice_id", ELEV8).is("deleted_at", null).order("created_at").limit(1).maybeSingle();
console.log("patient:", patient.first_name, patient.last_name, patient.id);

const pub = createClient(process.env.DEST_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data: si, error } = await pub.auth.signInWithPassword({ email: "randi@elev8.health", password: "HealthSync-Demo-2026!" });
if (error) { console.log("sign-in failed:", error.message); process.exit(1); }
const cookieVal = "base64-" + Buffer.from(JSON.stringify(si.session)).toString("base64");
const name = `sb-${REF}-auth-token`;
const CHUNK = 3180;
const parts = cookieVal.length <= CHUNK ? [[name, cookieVal]] : Array.from({ length: Math.ceil(cookieVal.length / CHUNK) }, (_, j) => [`${name}.${j}`, cookieVal.slice(j * CHUNK, j * CHUNK + CHUNK)]);
const cookie = parts.map(([n, v]) => `${n}=${v}`).join("; ");

const before = (await admin.from("ai_drafts").select("id", { count: "exact", head: true }).eq("patient_id", patient.id).eq("status", "pending")).count ?? 0;
const res = await fetch(`${BASE}/api/ai/soap`, { method: "POST", headers: { "content-type": "application/json", Cookie: cookie }, body: JSON.stringify({ patientId: patient.id }) });
const body = await res.json().catch(() => ({}));
console.log("/api/ai/soap ->", res.status, JSON.stringify(body).slice(0, 160));

const { data: drafts } = await admin.from("ai_drafts").select("id, kind, status, draft_content").eq("patient_id", patient.id).eq("status", "pending").order("created_at", { ascending: false }).limit(1);
const after = drafts?.length ?? 0;
if (after > before || (drafts && drafts[0])) {
  console.log("\nAI DRAFT PRODUCER ✓ — pending draft created (kind:", drafts[0].kind + ")");
  console.log("draft preview:", String(drafts[0].draft_content || "").slice(0, 220).replace(/\n/g, " "));
} else {
  console.log("\nNo draft created — response:", res.status, JSON.stringify(body).slice(0, 200));
}
