-- 018_chiro_spine.sql — the `chiro` module's clinical table: spine_assessments.
-- One row per chiropractic assessment (per visit). Per-vertebra findings and the
-- overall spine conditions are stored as jsonb overlays (same approach as the
-- body-map on scans), keyed to lib/spine/schema.ts. Defensive create-if-not-exists
-- + add-column-if-not-exists so it converges regardless of prior state.
-- Mirrors the vertical-module shape (see 008_hrt.sql).

create table if not exists public.spine_assessments (
  id             uuid primary key default gen_random_uuid(),
  practice_id    uuid not null default public.current_practice_id(),
  patient_id     uuid not null,
  practitioner_id uuid,
  assessment_date date not null default current_date,
  -- Array<VertebraFinding> — { region_code (c1..s1), s1 (baseline), s2 (current), note, nerve }
  vertebrae      jsonb not null default '[]',
  -- SpineConditions — { scoliosis:{cobbDeg,apex,convexity}, curves:{...}, flags:[], note }
  conditions     jsonb not null default '{}',
  -- Array — non-spinal postural-chain findings (head/shoulders/pelvis/knees/feet)
  regions        jsonb not null default '[]',
  -- Array — voice-annotation provenance { region_code, transcript, created_at }
  voice_notes    jsonb not null default '[]',
  -- Reference to an uploaded Tytron thermal scan file (filled by the thermal import)
  thermal_ref    text,
  status         text not null default 'draft' check (status in ('draft','final')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.spine_assessments add column if not exists practice_id     uuid not null default public.current_practice_id();
alter table public.spine_assessments add column if not exists patient_id      uuid not null;
alter table public.spine_assessments add column if not exists practitioner_id uuid;
alter table public.spine_assessments add column if not exists assessment_date date not null default current_date;
alter table public.spine_assessments add column if not exists vertebrae       jsonb not null default '[]';
alter table public.spine_assessments add column if not exists conditions      jsonb not null default '{}';
alter table public.spine_assessments add column if not exists regions         jsonb not null default '[]';
alter table public.spine_assessments add column if not exists voice_notes     jsonb not null default '[]';
alter table public.spine_assessments add column if not exists thermal_ref     text;
alter table public.spine_assessments add column if not exists status          text not null default 'draft';
alter table public.spine_assessments add column if not exists created_at      timestamptz not null default now();
alter table public.spine_assessments add column if not exists updated_at      timestamptz not null default now();

create index if not exists spine_assessments_patient_idx
  on public.spine_assessments (practice_id, patient_id, assessment_date desc);

-- tenant RLS
do $$
declare t text;
begin
  foreach t in array array['spine_assessments'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename=t and policyname=t||'_tenant') then
      execute format('create policy %I on public.%I for all using (practice_id = public.current_practice_id()) with check (practice_id = public.current_practice_id())', t||'_tenant', t);
    end if;
  end loop;
end $$;
