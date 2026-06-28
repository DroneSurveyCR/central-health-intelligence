// Release-gate smoke test: verifies the whole live app in one run (HTTP-level).
// Public pages serve, every protected surface gates, APIs self-auth, engines run,
// health is green. Exits non-zero on any failure. Run:
//   PROVE_BASE_URL=<deployment> node --env-file=.env.local scripts/smoke.mjs
// (defaults to the production alias; CRON_SECRET read from env for engine checks.)
const BASE = process.env.PROVE_BASE_URL || "https://healthsync-cloud-mu.vercel.app";
const CRON = process.env.CRON_SECRET || "";

let pass = 0, fail = 0;
const results = [];
async function check(label, path, want, opts = {}) {
  try {
    const res = await fetch(BASE + path, { method: opts.method || "GET", redirect: "manual", headers: opts.headers, body: opts.body });
    const ok = Array.isArray(want) ? want.includes(res.status) : res.status === want;
    results.push(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(42)} ${path.padEnd(34)} -> ${res.status} (want ${want})`);
    ok ? pass++ : fail++;
  } catch (e) {
    results.push(`FAIL  ${label.padEnd(42)} ${path.padEnd(34)} -> ERROR ${String(e).slice(0, 40)}`);
    fail++;
  }
}

// public
await check("home redirects", "/", [307, 308, 200]);
await check("login serves", "/login", 200);
await check("onboarding wizard serves", "/onboarding", 200);
await check("public clinic page", "/p/casa-elev8", 200);
await check("public clinic 404", "/p/zzz-nope", 404);
await check("health green", "/api/health", 200);
// staff + intelligence (gate -> 307 login)
for (const p of ["/focus", "/patients", "/triage", "/desk", "/approvals", "/notifications", "/modalities", "/reports", "/superadmin", "/settings/billing", "/settings/payments", "/settings/security"])
  await check("staff gated", p, 307);
// module pages
for (const p of ["/peptide/x", "/psychedelic/x", "/longevity/x", "/biomarker/x", "/nutrition/x", "/wearables/x", "/hrt/x", "/rx/x", "/weight/x", "/dispensary"])
  await check("module gated", p, 307);
// patient
for (const p of ["/home", "/today", "/connections", "/assistant", "/updates", "/privacy", "/mfa"])
  await check("patient gated", p, 307);
// APIs self-auth (401/503, never an HTML redirect)
for (const p of ["/api/billing/checkout", "/api/billing/portal", "/api/billing/setup-fee", "/api/ai/soap", "/api/assistant", "/api/connect/disconnect"])
  await check("api self-auth", p, [401, 403, 503], { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
// engines (need CRON secret) — crons are HEADER-ONLY (Authorization: Bearer); the query-string
// secret was removed (it leaked into access logs). GET is fine for the engine endpoints.
if (CRON) for (const c of ["sync", "alerts", "briefing"]) await check("cron engine", `/api/cron/${c}`, 200, { headers: { authorization: `Bearer ${CRON}` } });
await check("cron rejects no-secret", "/api/cron/sync", 401);

console.log(results.join("\n"));
console.log(`\n${pass} passed, ${fail} failed  —  ${fail === 0 ? "RELEASE GATE GREEN ✓" : "GATE RED ✗"}`);
process.exit(fail === 0 ? 0 : 1);
