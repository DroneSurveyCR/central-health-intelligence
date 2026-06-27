-- 005_connector_sync.sql — harden the connector sync engine.
-- The tables (connector_oauth_tokens, connector_sync_jobs, wearable_daily_summaries)
-- were created by earlier module migrations; this migration makes the JOB QUEUE
-- reliable (claim-with-skip-locked), adds sync-scheduling columns, and guarantees
-- the idempotency constraint the worker upserts against. All statements are
-- defensive (IF NOT EXISTS / DO-guards) so it is safe to re-run.

-- 1) Job-queue table: ensure full shape regardless of prior state.
create table if not exists public.connector_sync_jobs (
  id              uuid primary key default gen_random_uuid(),
  practice_id     uuid not null default public.current_practice_id(),
  patient_id      uuid not null,
  connector_slug  text not null,
  kind            text not null default 'incremental'
                    check (kind in ('backfill','incremental','webhook')),
  status          text not null default 'queued'
                    check (status in ('queued','running','done','failed','dead')),
  attempts        int  not null default 0,
  next_attempt_at timestamptz not null default now(),
  window_start    timestamptz,
  window_end      timestamptz,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- patch columns if the table pre-existed with a thinner shape
alter table public.connector_sync_jobs add column if not exists practice_id     uuid not null default public.current_practice_id();
alter table public.connector_sync_jobs add column if not exists kind            text not null default 'incremental';
alter table public.connector_sync_jobs add column if not exists status          text not null default 'queued';
alter table public.connector_sync_jobs add column if not exists attempts        int  not null default 0;
alter table public.connector_sync_jobs add column if not exists next_attempt_at timestamptz not null default now();
alter table public.connector_sync_jobs add column if not exists window_start    timestamptz;
alter table public.connector_sync_jobs add column if not exists window_end      timestamptz;
alter table public.connector_sync_jobs add column if not exists error           text;
alter table public.connector_sync_jobs add column if not exists updated_at      timestamptz not null default now();

-- 2) Scheduling columns on the token store (drive the per-token cadence).
alter table public.connector_oauth_tokens add column if not exists last_sync_at timestamptz;
alter table public.connector_oauth_tokens add column if not exists next_sync_at timestamptz not null default now();
alter table public.connector_oauth_tokens add column if not exists updated_at   timestamptz not null default now();

-- 3) Indexes for the scheduler + worker.
create index if not exists idx_sync_jobs_claim on public.connector_sync_jobs (status, next_attempt_at);
create index if not exists idx_oauth_tokens_due on public.connector_oauth_tokens (status, next_sync_at);

-- 4) Idempotency: one summary row per (patient, connector, date) so re-runs upsert.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_wearable_daily'
  ) then
    -- de-dupe any pre-existing rows before adding the constraint
    delete from public.wearable_daily_summaries a using public.wearable_daily_summaries b
      where a.ctid < b.ctid
        and a.patient_id = b.patient_id
        and a.connector_slug = b.connector_slug
        and a.date = b.date;
    alter table public.wearable_daily_summaries
      add constraint uq_wearable_daily unique (patient_id, connector_slug, date);
  end if;
end $$;

-- 5) RLS on the job queue (reads scoped to the tenant; the worker uses the admin client).
alter table public.connector_sync_jobs enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='connector_sync_jobs' and policyname='sync_jobs_tenant_read') then
    create policy sync_jobs_tenant_read on public.connector_sync_jobs
      for select using (practice_id = public.current_practice_id());
  end if;
end $$;

-- 6) Atomic claim: pull N due jobs, mark them running, return them. SKIP LOCKED so
--    concurrent workers never double-process. SECURITY DEFINER (worker is admin client).
create or replace function public.claim_connector_sync_jobs(max_jobs int default 20)
returns setof public.connector_sync_jobs
language plpgsql security definer set search_path = public as $$
declare claimed public.connector_sync_jobs;
begin
  for claimed in
    select * from public.connector_sync_jobs
      where status in ('queued','failed')
        and next_attempt_at <= now()
      order by next_attempt_at
      for update skip locked
      limit max_jobs
  loop
    update public.connector_sync_jobs
       set status='running', attempts = attempts + 1, updated_at = now()
     where id = claimed.id;
    claimed.status := 'running';
    claimed.attempts := claimed.attempts + 1;
    return next claimed;
  end loop;
end $$;
