// Restore standard Supabase role grants on the Cloud public schema
// (dropping/recreating the schema during clone wiped them). RLS still gates
// anon/authenticated; service_role bypasses RLS and needs table grants.
const PAT = process.env.SUPABASE_PAT;
const DEST = process.env.DEST_REF || "aezudceznxclvexfpdvr";
if (!PAT) { console.error("Missing SUPABASE_PAT"); process.exit(1); }

const sql = `
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${DEST}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
console.log("status:", res.status, (await res.text()) || "ok");
process.exit(res.ok ? 0 : 1);
