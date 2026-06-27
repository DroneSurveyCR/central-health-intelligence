// Prove billing end-to-end: send a Stripe-SIGNED subscription event to the live
// webhook and confirm it flips a throwaway practice's plan + modules. Safe — uses
// a dedicated 'billing-sandbox' practice, never Casa Elev8.
// Run: node --env-file=.env --env-file=.env.local scripts/test-billing-webhook.mjs
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.PROVE_BASE_URL || "https://healthsync-cloud-mu.vercel.app";
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET;
const admin = createClient(process.env.DEST_URL, process.env.DEST_SERVICE_KEY, { auth: { persistSession: false } });

// 1. ensure a throwaway test practice (starter)
const slug = "billing-sandbox";
let { data: prac } = await admin.from("practices").select("id").eq("slug", slug).maybeSingle();
if (!prac) {
  const ins = await admin.from("practices")
    .insert({ slug, name: "Billing Sandbox", plan: "starter", region: "us", modules: ["scheduling", "billing", "portal", "engagement"] })
    .select("id").maybeSingle();
  prac = ins.data;
}
const practiceId = prac.id;
// reset to starter so the flip is observable
await admin.from("practices").update({ plan: "starter", modules: ["scheduling", "billing", "portal", "engagement"] }).eq("id", practiceId);
console.log("test practice:", practiceId, "(reset to starter)");

// 2. build a signed checkout.session.completed (subscription) event
const event = {
  id: "evt_sandbox_" + practiceId.slice(0, 8),
  object: "event",
  api_version: "2024-06-20",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_sandbox",
      object: "checkout.session",
      mode: "subscription",
      customer: "cus_sandbox",
      subscription: "sub_sandbox",
      payment_status: "paid",
      metadata: { practiceId, plan: "growth" },
    },
  },
};
const body = JSON.stringify(event);
const t = Math.floor(Date.now() / 1000);
const sig = crypto.createHmac("sha256", WHSEC).update(`${t}.${body}`).digest("hex");

// 3. POST to the live webhook
const res = await fetch(`${BASE}/api/stripe/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Stripe-Signature": `t=${t},v1=${sig}` },
  body,
});
console.log("webhook response:", res.status, JSON.stringify(await res.json()));

// 4. verify the flip
const { data: after } = await admin.from("practices").select("plan, modules, stripe_subscription_id").eq("id", practiceId).maybeSingle();
const mods = (after?.modules ?? []);
const ok = after?.plan === "growth" && mods.includes("labs") && mods.includes("longevity") && mods.includes("nutrition");
console.log("after:", JSON.stringify({ plan: after?.plan, modules: mods, sub: after?.stripe_subscription_id }));
console.log(ok ? "\nENTITLEMENT FLIP ✓ (starter → growth, labs/nutrition/longevity unlocked)" : "\nFAILED — plan/modules did not update");
