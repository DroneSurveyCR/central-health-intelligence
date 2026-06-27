-- 008_hrt.sql — guarantee the HRT (Cluster A) tables have a known schema.
-- Defensive: create-if-not-exists + add-column-if-not-exists so it converges
-- regardless of prior state. Mirrors the peptide module shape.

create table if not exists public.hrt_protocols (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null default public.current_practice_id(),
  patient_id    uuid not null,
  prescriber_id uuid,
  hormone       text not null,
  route         text,
  current_dose  numeric,
  dose_unit     text not null default 'mg',
  frequency     text,
  titration_schedule jsonb not null default '[]',
  status        text not null default 'active' check (status in ('active','paused','completed','discontinued')),
  start_date    date not null default current_date,
  current_week  int not null default 1,
  goal          text,
  created_at    timestamptz not null default now()
);
alter table public.hrt_protocols add column if not exists practice_id  uuid not null default public.current_practice_id();
alter table public.hrt_protocols add column if not exists hormone      text;
alter table public.hrt_protocols add column if not exists route        text;
alter table public.hrt_protocols add column if not exists current_dose numeric;
alter table public.hrt_protocols add column if not exists dose_unit    text not null default 'mg';
alter table public.hrt_protocols add column if not exists frequency    text;
alter table public.hrt_protocols add column if not exists titration_schedule jsonb not null default '[]';
alter table public.hrt_protocols add column if not exists status       text not null default 'active';
alter table public.hrt_protocols add column if not exists start_date   date not null default current_date;
alter table public.hrt_protocols add column if not exists current_week int not null default 1;
alter table public.hrt_protocols add column if not exists goal         text;
alter table public.hrt_protocols add column if not exists prescriber_id uuid;

create table if not exists public.hrt_administrations (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null default public.current_practice_id(),
  patient_id    uuid not null,
  protocol_id   uuid,
  dose          numeric,
  dose_unit     text not null default 'mg',
  route         text,
  injection_site text,
  labs          jsonb,
  side_effects  text[],
  side_effect_severity int,
  notes         text,
  administered_by text,
  created_at    timestamptz not null default now()
);
alter table public.hrt_administrations add column if not exists practice_id uuid not null default public.current_practice_id();
alter table public.hrt_administrations add column if not exists protocol_id uuid;
alter table public.hrt_administrations add column if not exists dose numeric;
alter table public.hrt_administrations add column if not exists dose_unit text not null default 'mg';
alter table public.hrt_administrations add column if not exists route text;
alter table public.hrt_administrations add column if not exists injection_site text;
alter table public.hrt_administrations add column if not exists labs jsonb;
alter table public.hrt_administrations add column if not exists side_effects text[];
alter table public.hrt_administrations add column if not exists side_effect_severity int;
alter table public.hrt_administrations add column if not exists notes text;
alter table public.hrt_administrations add column if not exists administered_by text;

-- tenant RLS
do $$
declare t text;
begin
  foreach t in array array['hrt_protocols','hrt_administrations'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename=t and policyname=t||'_tenant') then
      execute format('create policy %I on public.%I for all using (practice_id = public.current_practice_id()) with check (practice_id = public.current_practice_id())', t||'_tenant', t);
    end if;
  end loop;
end $$;
