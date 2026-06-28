// ============================================================================
// HealthSync Cloud — apply all migrations in supabase/migrations/ in order.
// Uses a direct Postgres connection (no MCP / psql needed).
//
// Env required (put in .env, then run via `npm run migrate`):
//   DEST_DB_URL   Postgres connection string from Supabase:
//                 Settings -> Database -> Connection string -> URI (with password)
//
// Run:  npm run migrate
// ============================================================================

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import pg from "pg";

const url = process.env.DEST_DB_URL;
if (!url) { console.error("Missing DEST_DB_URL (see .env.example)"); process.exit(1); }

const migrationsDir = join(fileURLToPath(new URL("../supabase/migrations", import.meta.url)));
const allFiles = await readdir(migrationsDir);
const FILES = allFiles.filter((f) => f.endsWith(".sql")).sort();

// Split SQL into individual statements, respecting $$ dollar-quoted blocks.
// Required because CREATE INDEX CONCURRENTLY cannot run in a multi-statement
// protocol message — PostgreSQL rejects it with "cannot run inside a
// transaction block / multi-statement string."
function toStatements(sql) {
  const out = [];
  let buf = "";
  let depth = 0;
  let tag = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (depth === 0 && ch === "$") {
      const end = sql.indexOf("$", i + 1);
      if (end !== -1) {
        tag = sql.slice(i, end + 1);
        depth++;
        buf += tag;
        i = end;
        continue;
      }
    } else if (depth > 0 && sql.slice(i, i + tag.length) === tag) {
      depth--;
      buf += tag;
      i += tag.length - 1;
      if (depth === 0) tag = null;
      continue;
    }
    if (depth === 0 && ch === ";") {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = "";
    } else {
      buf += ch;
    }
  }
  const last = buf.trim();
  if (last) out.push(last);
  return out;
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  for (const f of FILES) {
    const sql = await readFile(join(migrationsDir, f), "utf8");
    process.stdout.write(`applying ${f} ... `);
    const stmts = toStatements(sql).filter(
      (s) => s.split("\n").some((ln) => ln.trim() && !ln.trim().startsWith("--"))
    );
    for (const stmt of stmts) await client.query(stmt);
    console.log("ok");
  }
  await client.end();
  console.log(`\nAll ${FILES.length} migrations applied. Next: npm run etl:dry -> etl:apply -> test:tenant-isolation`);
}

run().catch(async (e) => {
  try { await client.end(); } catch {}
  console.error("\nMIGRATION FAILED:", e.message);
  process.exit(1);
});
