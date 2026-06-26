// Add practice_id NOT NULL (+FK +index) to the new module tables in Cloud,
// completing the tenancy invariant. Tables are empty so backfill is a no-op.
const PAT = process.env.SUPABASE_PAT;
const DEST = process.env.DEST_REF || "aezudceznxclvexfpdvr";
if (!PAT) { console.error("Missing SUPABASE_PAT"); process.exit(1); }

const sql = `do $$
declare t text;
  elev8 constant uuid := '11111111-1111-1111-1111-111111111111';
  tbls text[] := array[
    'psychedelic_screenings','psychedelic_sessions','psychedelic_integration_notes',
    'peptide_protocols','peptide_administrations','prescriptions',
    'biomarker_panels','food_logs','supplement_logs','nutrition_protocols',
    'biological_age_scores','wearable_daily_summaries','connector_oauth_tokens','ai_drafts'];
begin
  foreach t in array tbls loop
    execute format('alter table public.%I add column if not exists practice_id uuid', t);
    execute format('update public.%I set practice_id=%L where practice_id is null', t, elev8);
    execute format('alter table public.%I alter column practice_id set not null', t);
    if not exists (select 1 from pg_constraint where conname = t||'_practice_id_fkey') then
      execute format('alter table public.%I add constraint %I foreign key (practice_id) references public.practices(id) on delete cascade', t, t||'_practice_id_fkey');
    end if;
    execute format('create index if not exists %I on public.%I(practice_id)', 'idx_'||t||'_practice_id', t);
  end loop;
end $$;`;

const res = await fetch(`https://api.supabase.com/v1/projects/${DEST}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
console.log("module tenancy:", res.status, (await res.text()) || "ok");
process.exit(res.ok ? 0 : 1);
