-- 007_intelligence_marketplace.sql
-- Part 9 (two-sided experience / intelligence layer) + Part 10 (modality marketplace).
-- All tenant tables: practice_id NOT NULL default current_practice_id(), tenant RLS.
-- Defensive (IF NOT EXISTS) so it is safe to re-run.

-- ===== Part 9 — intelligence + collaboration =====

create table if not exists public.patient_briefings (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null default public.current_practice_id(),
  patient_id    uuid not null,
  briefing_date date not null default current_date,
  summary       text,
  deltas        jsonb not null default '[]',
  talking_points jsonb not null default '[]',
  generated_at  timestamptz not null default now(),
  unique (patient_id, briefing_date)
);

create table if not exists public.alert_rules (
  id          uuid primary key default gen_random_uuid(),
  practice_id uuid not null default public.current_practice_id(),
  name        text not null,
  metric      text not null,                 -- e.g. resting_hr, hrv_ms, avg_glucose_mgdl, hba1c
  comparator  text not null default 'gt' check (comparator in ('gt','lt','gte','lte')),
  threshold   numeric not null,
  severity    text not null default 'warn' check (severity in ('info','warn','urgent')),
  enabled     boolean not null default true,
  created_by  uuid,
  created_at  timestamptz not null default now()
);

create table if not exists public.alerts (
  id              uuid primary key default gen_random_uuid(),
  practice_id     uuid not null default public.current_practice_id(),
  patient_id      uuid not null,
  rule_id         uuid,
  metric          text not null,
  value           numeric,
  severity        text not null default 'warn' check (severity in ('info','warn','urgent')),
  message         text,
  status          text not null default 'open' check (status in ('open','ack','resolved','snoozed')),
  snoozed_until   timestamptz,
  acknowledged_by uuid,
  created_at      timestamptz not null default now(),
  -- dedup: one open alert per (patient, rule/metric, day)
  dedup_key       text
);
create unique index if not exists uq_alerts_dedup on public.alerts (patient_id, dedup_key) where dedup_key is not null;

create table if not exists public.ai_drafts (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null default public.current_practice_id(),
  patient_id    uuid,
  kind          text not null,               -- soap, synthesis, titration, narrative, message_reply, superbill
  content       text not null,
  model         text,
  prompt_version text,
  source_ref    text,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_by    uuid,
  reviewed_by   uuid,
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);

create table if not exists public.care_team (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null default public.current_practice_id(),
  patient_id    uuid not null,
  practitioner_id uuid not null,
  role          text,                        -- md, np, nutritionist, coach, front_desk
  can_approve   boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (patient_id, practitioner_id)
);

create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null default public.current_practice_id(),
  patient_id    uuid,
  title         text not null,
  detail        text,
  assignee_id   uuid,
  status        text not null default 'open' check (status in ('open','done')),
  due_at        timestamptz,
  created_by    uuid,
  created_at    timestamptz not null default now()
);

create table if not exists public.patient_milestones (
  id          uuid primary key default gen_random_uuid(),
  practice_id uuid not null default public.current_practice_id(),
  patient_id  uuid not null,
  kind        text not null,                 -- streak, biomarker, weight, adherence
  label       text not null,
  value       numeric,
  achieved_at timestamptz not null default now()
);

create table if not exists public.patient_data_consents (
  id          uuid primary key default gen_random_uuid(),
  practice_id uuid not null default public.current_practice_id(),
  patient_id  uuid not null,
  domain      text not null,                 -- wearables, labs, mood, nutrition, ...
  scope       text not null default 'clinic' check (scope in ('clinic','private')),
  updated_at  timestamptz not null default now(),
  unique (patient_id, domain)
);

-- ===== Part 10 — modality marketplace + outcomes =====

create table if not exists public.modalities (
  id              uuid primary key default gen_random_uuid(),
  practice_id     uuid,                       -- NULL = global curated; else practice-custom
  name            text not null,
  category        text,
  indications     text[] not null default '{}',
  target_markers  text[] not null default '{}',
  evidence_level  text,
  contraindications text[] not null default '{}',
  typical_cost    numeric,
  typical_duration text,
  created_at      timestamptz not null default now()
);

create table if not exists public.modality_recommendations (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null default public.current_practice_id(),
  patient_id    uuid not null,
  modality_id   uuid not null,
  recommended_by uuid,
  rationale     text,
  target_markers text[] not null default '{}',
  measurement_window_days int not null default 30,
  status        text not null default 'recommended' check (status in ('recommended','accepted','declined','completed')),
  recommended_at timestamptz not null default now()
);

create table if not exists public.modality_outcomes (
  id              uuid primary key default gen_random_uuid(),
  practice_id     uuid not null default public.current_practice_id(),
  recommendation_id uuid not null,
  patient_id      uuid not null,
  marker          text not null,
  baseline        numeric,
  during          numeric,
  after           numeric,
  delta           numeric,
  direction       text,
  verdict         text check (verdict in ('improved','no_change','worsened','inconclusive')),
  interpreted_by  uuid,
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.modality_courses (
  id              uuid primary key default gen_random_uuid(),
  practice_id     uuid not null default public.current_practice_id(),
  recommendation_id uuid not null,
  patient_id      uuid not null,
  sessions_total  int not null default 1,
  sessions_done   int not null default 0,
  next_session_at timestamptz,
  status          text not null default 'active' check (status in ('active','completed','paused'))
);

-- ===== Tenant RLS (uniform: practice_id = current_practice_id()) =====
do $$
declare t text;
begin
  foreach t in array array[
    'patient_briefings','alert_rules','alerts','ai_drafts','care_team','tasks',
    'patient_milestones','patient_data_consents','modality_recommendations',
    'modality_outcomes','modality_courses'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename=t and policyname=t||'_tenant') then
      execute format(
        'create policy %I on public.%I for all using (practice_id = public.current_practice_id()) with check (practice_id = public.current_practice_id())',
        t||'_tenant', t);
    end if;
  end loop;
end $$;

-- modalities: global rows (practice_id null) are readable by everyone; writes are tenant-scoped.
alter table public.modalities enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='modalities' and policyname='modalities_read') then
    create policy modalities_read on public.modalities for select
      using (practice_id is null or practice_id = public.current_practice_id());
  end if;
  if not exists (select 1 from pg_policies where tablename='modalities' and policyname='modalities_write') then
    create policy modalities_write on public.modalities for all
      using (practice_id = public.current_practice_id())
      with check (practice_id = public.current_practice_id());
  end if;
end $$;

-- helpful indexes
create index if not exists idx_alerts_open on public.alerts (practice_id, status, severity);
create index if not exists idx_aidrafts_pending on public.ai_drafts (practice_id, status);
create index if not exists idx_tasks_open on public.tasks (practice_id, status);
create index if not exists idx_reco_patient on public.modality_recommendations (practice_id, patient_id);
