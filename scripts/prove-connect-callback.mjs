// Prove the Connect-button path end-to-end on the live app: a signed OAuth callback
// (what the sandbox provider redirects to) → token stored + backfill enqueued → cron
// → normalized rows. No browser session needed (callback trusts the signed state).
// Run: node --env-file=.env --env-file=.env.local scripts/prove-connect-callback.mjs
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const ELEV8 = "11111111-1111-1111-1111-111111111111";
const BASE = process.env.PROVE_BASE_URL || "https://healthsync-cloud-mu.vercel.app";
const SECRET = process.env.CONNECTOR_STATE_SECRET || process.env.CRON_SECRET;
const admin = createClient(process.env.DEST_URL, process.env.DEST_SERVICE_KEY, { auth: { persistSession: false } });
const b64url = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const { data: patient } = await admin.from("patients").select("id").eq("practice_id", ELEV8).limit(1).maybeSingle();
const clean = async () => {
  for (const t of ["wearable_daily_summaries", "connector_sync_jobs", "connector_oauth_tokens"])
    await admin.from(t).delete().eq("patient_id", patient.id).eq("connector_slug", "sandbox");
};
await clean();

const body = b64url(JSON.stringify({ practice_id: ELEV8, patient_id: patient.id, slug: "sandbox", ts: Date.now() }));
const sig = b64url(crypto.createHmac("sha256", SECRET).update(body).digest());
const state = `${body}.${sig}`;

const cb = await fetch(`${BASE}/api/connectors/sandbox/callback?code=sandbox-grant&state=${encodeURIComponent(state)}`, { redirect: "manual" });
console.log("callback:", cb.status, "->", cb.headers.get("location") || "");

const { data: tok } = await admin.from("connector_oauth_tokens").select("status").eq("patient_id", patient.id).eq("connector_slug", "sandbox").maybeSingle();
const { count: jobs } = await admin.from("connector_sync_jobs").select("*", { count: "exact", head: true }).eq("patient_id", patient.id).eq("connector_slug", "sandbox");
console.log("token after callback:", JSON.stringify(tok), "| backfill jobs:", jobs);

const cron = await fetch(`${BASE}/api/cron/sync?secret=${encodeURIComponent(process.env.CRON_SECRET)}`).then((r) => r.json());
console.log("cron:", JSON.stringify(cron));
const { count: rows } = await admin.from("wearable_daily_summaries").select("*", { count: "exact", head: true }).eq("patient_id", patient.id).eq("connector_slug", "sandbox");
console.log(rows > 0 ? `\nCONNECT FLOW ✓ — ${rows} daily rows synced via the connect callback` : "\nFAILED — no rows synced");

await clean();
console.log("cleaned up demo data");
