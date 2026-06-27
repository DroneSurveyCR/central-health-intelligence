// One-time Stripe TEST-mode activation for Cloud billing. Reads the sk_test key
// from the session transcript (never printed), creates plan products + recurring
// prices, registers the webhook endpoint, and writes all of it to .env.local.
// Run: node scripts/setup-stripe.mjs
import fs from "fs";

const TX = "C:/Users/nicki/.claude/projects/c--Users-nicki-Desktop-Master-websites/6a7b19c4-d8df-4084-b4ae-af1f537a2e5d.jsonl";
const WEBHOOK_URL = "https://healthsync-cloud-mu.vercel.app/api/stripe/webhook";

// --- extract sk_test key (longest unique match) ---
const buf = fs.readFileSync(TX, "utf8");
const keys = [...new Set((buf.match(/sk_test_[A-Za-z0-9]{20,}/g) || []))].sort((a, b) => b.length - a.length);
const SK = keys[0];
if (!SK) { console.error("no sk_test key found in transcript"); process.exit(1); }
console.log("found sk_test key:", SK.slice(0, 12) + "…(masked, len " + SK.length + ")");

async function stripe(path, form) {
  const res = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + SK, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(j.error || j).slice(0, 200)}`);
  return j;
}

// --- products + monthly recurring prices ---
const PLANS = [
  { env: "STRIPE_PRICE_STARTER", name: "HealthSync Solo", amount: 14900 },
  { env: "STRIPE_PRICE_GROWTH", name: "HealthSync Clinic", amount: 34900 },
  { env: "STRIPE_PRICE_NETWORK", name: "HealthSync Network", amount: 59900 },
];
const priceIds = {};
for (const p of PLANS) {
  const product = await stripe("products", { name: p.name });
  const price = await stripe("prices", {
    product: product.id,
    unit_amount: String(p.amount),
    currency: "usd",
    "recurring[interval]": "month",
  });
  priceIds[p.env] = price.id;
  console.log(`  ${p.name}: ${price.id}`);
}

// --- webhook endpoint -> signing secret ---
const wh = await stripe("webhook_endpoints", {
  url: WEBHOOK_URL,
  "enabled_events[]": "checkout.session.completed",
  "enabled_events[1]": "customer.subscription.created",
  "enabled_events[2]": "customer.subscription.updated",
  "enabled_events[3]": "customer.subscription.deleted",
});
console.log("  webhook endpoint:", wh.id, "secret:", String(wh.secret).slice(0, 10) + "…(masked)");

// --- write to .env.local (append, replacing any existing of these keys) ---
const path = ".env.local";
let env = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
const set = (k, v) => {
  const re = new RegExp("^" + k + "=.*$", "m");
  env = re.test(env) ? env.replace(re, `${k}=${v}`) : env.trimEnd() + `\n${k}=${v}`;
};
set("STRIPE_SECRET_KEY", SK);
set("STRIPE_WEBHOOK_SECRET", wh.secret);
for (const [k, v] of Object.entries(priceIds)) set(k, v);
fs.writeFileSync(path, env.trimEnd() + "\n");
console.log("\nwrote STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 3x STRIPE_PRICE_* to .env.local");
