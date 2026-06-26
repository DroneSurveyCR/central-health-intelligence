// ============================================================================
// HealthSync Cloud — clone Casa Elev8's public schema into the Cloud project.
// Reads the live catalog from SOURCE and applies reconstructed DDL to DEST,
// both via the Supabase Management API (no Docker / pg_dump / passwords needed).
//
// Order: extensions -> sequences -> tables(cols) -> pk/unique/check -> fk
//        -> indexes -> functions -> triggers -> enable RLS -> policies.
//
// Env (.env): SUPABASE_PAT
// Args: SOURCE ref and DEST ref are constants below.
// Run:  node --env-file=.env scripts/clone-schema.mjs
// ============================================================================

const PAT = process.env.SUPABASE_PAT;
if (!PAT) { console.error("Missing SUPABASE_PAT"); process.exit(1); }

const SOURCE = "bpvefxwjvaagbvloquvc";   // Casa Elev8
const DEST = process.env.DEST_REF || "aezudceznxclvexfpdvr"; // HealthSync Cloud
const API = "https://api.supabase.com/v1";
const H = { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" };

async function q(ref, query) {
  const res = await fetch(`${API}/projects/${ref}/database/query`, {
    method: "POST", headers: H, body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  return data;
}

const qi = (s) => `"${String(s).replace(/"/g, '""')}"`; // quote ident

async function read(query) { return q(SOURCE, query); }

// ---- gather DDL --------------------------------------------------------------
async function build() {
  const stmts = [];
  const add = (label, sql) => stmts.push({ label, sql });

  // Reset DEST public schema for a clean, re-runnable clone (Cloud only).
  add("reset:drop", "drop schema if exists public cascade");
  add("reset:create", "create schema public");
  add("reset:grant1", "grant usage on schema public to anon, authenticated, service_role");
  add("reset:grant2", "grant all on schema public to postgres, service_role");

  add("ext:pgcrypto", "create extension if not exists pgcrypto");

  // sequences
  const seqs = await read(`select sequence_name from information_schema.sequences where sequence_schema='public'`);
  for (const s of seqs) add(`seq:${s.sequence_name}`, `create sequence if not exists public.${qi(s.sequence_name)}`);

  // tables + columns
  const cols = await read(`
    select c.relname as tbl, a.attname as col,
           format_type(a.atttypid, a.atttypmod) as typ,
           a.attnotnull as notnull,
           pg_get_expr(d.adbin, d.adrelid) as dflt,
           a.attnum
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where n.nspname='public' and c.relkind='r' and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum`);
  const byTable = new Map();
  for (const r of cols) {
    if (!byTable.has(r.tbl)) byTable.set(r.tbl, []);
    let def = `${qi(r.col)} ${r.typ}`;
    if (r.dflt) def += ` default ${r.dflt}`;
    if (r.notnull) def += " not null";
    byTable.get(r.tbl).push(def);
  }
  for (const [tbl, defs] of byTable) {
    add(`table:${tbl}`, `create table if not exists public.${qi(tbl)} (\n  ${defs.join(",\n  ")}\n)`);
  }

  // constraints — pk/unique/check first, fk last
  const cons = await read(`
    select conrelid::regclass::text as tbl, conname, contype, pg_get_constraintdef(oid) as def
    from pg_constraint
    where connamespace = 'public'::regnamespace
    order by case contype when 'p' then 0 when 'u' then 1 when 'c' then 2 when 'f' then 3 else 4 end`);
  for (const c of cons) {
    add(`con:${c.conname}`, `alter table ${c.tbl} add constraint ${qi(c.conname)} ${c.def}`);
  }

  // indexes (skip those backing a constraint)
  const idx = await read(`
    select indexname, indexdef from pg_indexes i
    where schemaname='public'
      and not exists (select 1 from pg_constraint c where c.conname = i.indexname)`);
  for (const i of idx) add(`idx:${i.indexname}`, i.indexdef);

  // functions
  const fns = await read(`
    select pg_get_functiondef(p.oid) as def
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f'`);
  for (const f of fns) add("fn", f.def);

  // triggers
  const trg = await read(`
    select pg_get_triggerdef(t.oid) as def
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and not t.tgisinternal`);
  for (const t of trg) add("trg", t.def);

  // enable RLS
  const rls = await read(`
    select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity`);
  for (const r of rls) add(`rls:${r.relname}`, `alter table public.${qi(r.relname)} enable row level security`);

  // policies
  const pol = await read(`select tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname='public'`);
  for (const p of pol) {
    const cmd = p.cmd === "ALL" ? "all" : p.cmd.toLowerCase();
    // pg_policies.roles comes back as a Postgres array literal string e.g. "{public}".
    let roles = Array.isArray(p.roles) ? p.roles.join(", ") : String(p.roles ?? "").replace(/[{}]/g, "");
    if (!roles) roles = "public";
    let s = `create policy ${qi(p.policyname)} on public.${qi(p.tablename)}`;
    s += ` as ${String(p.permissive).toLowerCase() === "permissive" ? "permissive" : "restrictive"}`;
    s += ` for ${cmd} to ${roles}`;
    if (p.qual != null) s += ` using (${p.qual})`;
    if (p.with_check != null) s += ` with check (${p.with_check})`;
    add(`pol:${p.policyname}@${p.tablename}`, s);
  }

  return stmts;
}

async function main() {
  console.log(`Cloning schema  ${SOURCE} -> ${DEST}`);
  const stmts = await build();
  console.log(`Generated ${stmts.length} statements.\n`);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Reset must run as its own batch first (drop/create schema), then batch the rest.
  const resetCount = stmts.findIndex((s) => !s.label.startsWith("reset:"));
  const reset = stmts.slice(0, resetCount);
  const rest = stmts.slice(resetCount);

  let ok = 0, fail = 0;
  // apply reset as one batch
  await q(DEST, reset.map((s) => s.sql).join(";\n") + ";");
  ok += reset.length;
  console.log("reset applied.");

  const BATCH = 40;
  for (let i = 0; i < rest.length; i += BATCH) {
    const chunk = rest.slice(i, i + BATCH);
    const sql = chunk.map((s) => s.sql).join(";\n") + ";";
    try {
      await q(DEST, sql);
      ok += chunk.length;
      process.stdout.write(`batch ${i / BATCH + 1}: ${chunk.length} ok\n`);
    } catch (e) {
      // fall back to per-statement to pinpoint the culprit
      for (const s of chunk) {
        try { await q(DEST, s.sql); ok++; }
        catch (e2) { fail++; console.log(`FAIL ${s.label}: ${String(e2.message).slice(0, 160)}`); }
        await sleep(200);
      }
    }
    await sleep(300);
  }
  console.log(`\nDone. ok=${ok} fail=${fail}`);
  if (fail) { console.log("Some statements failed — review above before migrating."); process.exit(1); }
}

main().catch((e) => { console.error("CLONE FAILED:", e.message); process.exit(1); });
