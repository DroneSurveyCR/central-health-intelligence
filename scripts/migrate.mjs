// ============================================================================
// HealthSync Cloud — apply tenancy migrations 001 -> 003 to the Cloud project.
// Uses a direct Postgres connection (no MCP / psql needed).
//
// Env required (put in .env, then run via `npm run migrate`):
//   DEST_DB_URL   Postgres connection string from Supabase:
//                 Settings -> Database -> Connection string -> URI (with password)
//
// Run:  npm run migrate
// ============================================================================

import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DEST_DB_URL;
if (!url) { console.error("Missing DEST_DB_URL (see .env.example)"); process.exit(1); }

const FILES = ["001_practices.sql", "002_practice_id.sql", "003_tenant_rls.sql"];

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  for (const f of FILES) {
    const sql = await readFile(new URL(`../supabase/migrations/${f}`, import.meta.url), "utf8");
    process.stdout.write(`applying ${f} ... `);
    await client.query(sql);
    console.log("ok");
  }
  await client.end();
  console.log("\nAll tenancy migrations applied. Next: npm run etl:dry -> etl:apply -> test:tenant-isolation");
}

run().catch(async (e) => {
  try { await client.end(); } catch {}
  console.error("\nMIGRATION FAILED:", e.message);
  process.exit(1);
});
