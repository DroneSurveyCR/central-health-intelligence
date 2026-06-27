import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.DEST_URL, process.env.DEST_SERVICE_KEY, { auth: { persistSession: false } });
const [{ data: practices }, { data: pts }, { data: pracs }] = await Promise.all([
  admin.from("practices").select("id, slug, name, plan, vertical, region, modules, created_at").order("created_at", { ascending: true }),
  admin.from("patients").select("practice_id"),
  admin.from("practitioners").select("practice_id"),
]);
const tally = (rows) => { const m = new Map(); for (const r of rows ?? []) m.set(r.practice_id, (m.get(r.practice_id)||0)+1); return m; };
const pc = tally(pts), sc = tally(pracs);
console.log(`PRACTICES: ${practices?.length ?? 0} | total patients: ${(pts??[]).length} | total staff: ${(pracs??[]).length}\n`);
for (const p of practices ?? [])
  console.log(`  • ${p.name}  [${p.plan}/${p.vertical ?? "—"}/${p.region}]  modules:${(p.modules??[]).length}  patients:${pc.get(p.id)??0}  staff:${sc.get(p.id)??0}`);
