// Finish Stripe setup: create the webhook endpoint (indexed array params) and
// persist sk + whsec + the already-created price IDs to .env.local.
import fs from "fs";

const TX = "C:/Users/nicki/.claude/projects/c--Users-nicki-Desktop-Master-websites/6a7b19c4-d8df-4084-b4ae-af1f537a2e5d.jsonl";
const WEBHOOK_URL = "https://healthsync-cloud-mu.vercel.app/api/stripe/webhook";
const PRICES = {
  STRIPE_PRICE_STARTER: "price_1TmlDX0nNs7CA2cbsSc6CIkA",
  STRIPE_PRICE_GROWTH: "price_1TmlDX0nNs7CA2cbsDS91QQR",
  STRIPE_PRICE_NETWORK: "price_1TmlDY0nNs7CA2cbCsJEeil2",
};

const buf = fs.readFileSync(TX, "utf8");
const SK = [...new Set((buf.match(/sk_test_[A-Za-z0-9]{20,}/g) || []))].sort((a, b) => b.length - a.length)[0];
if (!SK) { console.error("no sk_test key"); process.exit(1); }

const wh = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
  method: "POST",
  headers: { Authorization: "Bearer " + SK, "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    url: WEBHOOK_URL,
    "enabled_events[0]": "checkout.session.completed",
    "enabled_events[1]": "customer.subscription.created",
    "enabled_events[2]": "customer.subscription.updated",
    "enabled_events[3]": "customer.subscription.deleted",
  }),
}).then((r) => r.json());
if (!wh.secret) { console.error("webhook create failed:", JSON.stringify(wh).slice(0, 300)); process.exit(1); }
console.log("webhook:", wh.id, "secret:", String(wh.secret).slice(0, 10) + "…(masked)");

const path = ".env.local";
let env = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
const set = (k, v) => {
  const re = new RegExp("^" + k + "=.*$", "m");
  env = re.test(env) ? env.replace(re, `${k}=${v}`) : env.trimEnd() + `\n${k}=${v}`;
};
set("STRIPE_SECRET_KEY", SK);
set("STRIPE_WEBHOOK_SECRET", wh.secret);
for (const [k, v] of Object.entries(PRICES)) set(k, v);
fs.writeFileSync(path, env.trimEnd() + "\n");
console.log("wrote STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 3x STRIPE_PRICE_* to .env.local");
