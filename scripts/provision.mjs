// ============================================================================
// HealthSync Cloud — one-shot provisioner via the Supabase Management API.
// Creates the project, applies migrations 001->003, fetches keys, writes .env.
// Fully autonomous given a Personal Access Token.
//
// Env required (.env):  SUPABASE_PAT   (supabase.com -> Account -> Access Tokens)
// Run:  npm run provision
// ============================================================================

import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

const PAT = process.env.SUPABASE_PAT;
if (!PAT) { console.error("Missing SUPABASE_PAT in .env"); process.exit(1); }

const API = "https://api.supabase.com/v1";
const H = { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" };
const REGION = "us-east-1";
const NAME = "HealthSync Cloud";

async function call(path, init) {
  const res = await fetch(`${API}${path}`, init);
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} -> ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // 1. organization
  const orgs = await call("/organizations", { headers: H });
  console.log("Organizations:", orgs.map((o) => `${o.name} (${o.id})`).join(", ") || "(none)");
  if (!orgs.length) throw new Error("No organizations for this PAT — wrong account?");
  // Prefer the real personal org over any Vercel-managed integration org.
  const org = orgs.find((o) => !String(o.id).startsWith("vercel_")) || orgs[0];
  console.log(`Using org: ${org.name} (${org.id})`);

  // 2. create (or reuse) the project
  const existing = await call("/projects", { headers: H });
  let proj = existing.find((p) => p.name === NAME);
  if (proj) {
    console.log(`Reusing existing project "${NAME}" (${proj.id}).`);
  } else {
    const dbPass = "Hs_" + randomBytes(18).toString("base64url");
    console.log(`Creating project "${NAME}" in ${org.name} / ${REGION} ...`);
    proj = await call("/projects", {
      method: "POST", headers: H,
      body: JSON.stringify({ name: NAME, organization_id: org.id, region: REGION, db_pass: dbPass }),
    });
    console.log(`Created ${proj.id}. (db password generated and held in API only)`);
  }
  const ref = proj.id || proj.ref;

  // 3. wait until healthy
  for (let i = 0; i < 90; i++) {
    const p = await call(`/projects/${ref}`, { headers: H });
    if (p.status === "ACTIVE_HEALTHY") { console.log("Project is ACTIVE_HEALTHY."); break; }
    process.stdout.write(`  status: ${p.status} …\n`);
    await sleep(5000);
  }

  // 4. apply tenancy migrations via the Management API SQL endpoint
  for (const f of ["001_practices.sql", "002_practice_id.sql", "003_tenant_rls.sql"]) {
    const sql = await readFile(new URL(`../supabase/migrations/${f}`, import.meta.url), "utf8");
    process.stdout.write(`applying ${f} ... `);
    await call(`/projects/${ref}/database/query`, { method: "POST", headers: H, body: JSON.stringify({ query: sql }) });
    console.log("ok");
  }

  // 5. fetch API keys
  const keys = await call(`/projects/${ref}/api-keys`, { headers: H });
  const find = (n) => keys.find((k) => k.name === n)?.api_key ?? keys.find((k) => k.name === n)?.key;
  const anon = find("anon");
  const service = find("service_role");
  if (!anon || !service) {
    console.log("Raw api-keys response:", JSON.stringify(keys));
    throw new Error("Could not parse anon/service_role keys — see raw response above.");
  }

  // 6. write DEST_* into .env (preserving SOURCE_*)
  const envUrl = new URL("../.env", import.meta.url);
  let env = await readFile(envUrl, "utf8").catch(() => "");
  const set = (k, v) => {
    const re = new RegExp(`^${k}=.*$`, "m");
    env = re.test(env) ? env.replace(re, `${k}=${v}`) : `${env.trimEnd()}\n${k}=${v}\n`;
  };
  set("DEST_URL", `https://${ref}.supabase.co`);
  set("DEST_SERVICE_KEY", service);
  set("DEST_ANON_KEY", anon);
  await writeFile(envUrl, env);

  console.log(`\n✅ Provisioned ${ref}. .env updated with DEST_URL / DEST_SERVICE_KEY / DEST_ANON_KEY.`);
  console.log("Next: npm run etl:apply  &&  npm run test:tenant-isolation");
}

main().catch((e) => { console.error("\nPROVISION FAILED:", e.message); process.exit(1); });
