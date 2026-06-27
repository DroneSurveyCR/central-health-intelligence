// End-to-end proof of the connector sync engine using the SANDBOX provider (no
// external creds). Seeds a token + backfill job for a practice-#1 patient, triggers
// the deployed cron worker, then verifies normalized rows landed — tenant-scoped.
// Run: node --env-file=.env scripts/prove-sync.mjs
import { createClient } from "@supabase/supabase-js";

const ELEV8 = "11111111-1111-1111-1111-111111111111";
const BASE = process.env.PROVE_BASE_URL || "https://healthsync-cloud-mu.vercel.app";
const SECRET = process.env.CRON_SECRET;
const admin = createClient(process.env.DEST_URL, process.env.DEST_SERVICE_KEY, { auth: { persistSession: false } });

const { data: patient } = await admin
  .from("patients").select("id, first_name, last_name").eq("practice_id", ELEV8).limit(1).maybeSingle();
if (!patient) { console.log("no practice-#1 patient found"); process.exit(1); }
console.log("patient:", patient.id);

// idempotent reset
await admin.from("wearable_daily_summaries").delete().eq("patient_id", patient.id).eq("connector_slug", "sandbox");
await admin.from("connector_sync_jobs").delete().eq("patient_id", patient.id).eq("connector_slug", "sandbox");
await admin.from("connector_oauth_tokens").delete().eq("patient_id", patient.id).eq("connector_slug", "sandbox");

// seed token + backfill job (what the OAuth callback does)
await admin.from("connector_oauth_tokens").insert({
  practice_id: ELEV8, patient_id: patient.id, connector_slug: "sandbox",
  access_token: "sandbox-access", refresh_token: "sandbox-refresh", status: "connected",
  next_sync_at: new Date().toISOString(),
});
const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
await admin.from("connector_sync_jobs").insert({
  practice_id: ELEV8, patient_id: patient.id, connector_slug: "sandbox",
  kind: "backfill", status: "queued", window_start: since,
});
console.log("seeded token + 14-day backfill job");

// trigger the deployed worker
const res = await fetch(`${BASE}/api/cron/sync?secret=${encodeURIComponent(SECRET)}`);
console.log("cron:", res.status, JSON.stringify(await res.json()));

// verify
const { data: rows } = await admin
  .from("wearable_daily_summaries")
  .select("date, resting_hr, hrv_ms, sleep_hours, readiness_score, practice_id")
  .eq("patient_id", patient.id).eq("connector_slug", "sandbox").order("date");
console.log(`\nwearable_daily_summaries rows: ${rows?.length ?? 0}`);
const practices = [...new Set((rows ?? []).map((r) => r.practice_id))];
console.log("distinct practice_id on rows:", practices, practices.length === 1 && practices[0] === ELEV8 ? "(tenant-correct ✓)" : "(LEAK!)");
if (rows?.length) {
  const s = rows[rows.length - 1];
  console.log("sample latest day:", JSON.stringify({ date: s.date, resting_hr: s.resting_hr, hrv_ms: s.hrv_ms, sleep_hours: s.sleep_hours, readiness_score: s.readiness_score }));
}
const { data: job } = await admin.from("connector_sync_jobs").select("status, attempts").eq("patient_id", patient.id).eq("connector_slug", "sandbox").maybeSingle();
console.log("job final status:", JSON.stringify(job));
