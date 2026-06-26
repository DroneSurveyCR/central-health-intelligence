// Disable Casa Elev8's user triggers in the Cloud project for the bulk ETL.
// The cloned audit triggers insert into audit_logs WITHOUT practice_id (now NOT
// NULL), which would fail every insert. Cloud reimplements audit with practice_id
// later; for Stage 1 we disable them. FK/system triggers stay on (ETL order is FK-safe).
const PAT = process.env.SUPABASE_PAT;
const DEST = process.env.DEST_REF || "aezudceznxclvexfpdvr";
if (!PAT) { console.error("Missing SUPABASE_PAT"); process.exit(1); }

const sql = `do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I disable trigger user', r.tablename);
  end loop;
end $$;`;

const res = await fetch(`https://api.supabase.com/v1/projects/${DEST}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
console.log("disable user triggers:", res.status, (await res.text()) || "ok");
process.exit(res.ok ? 0 : 1);
