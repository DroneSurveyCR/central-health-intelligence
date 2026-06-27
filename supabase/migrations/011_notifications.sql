-- ============================================================================
-- HealthSync Cloud — Migration 011: in-app notifications + delivery
-- ----------------------------------------------------------------------------
-- The alerting engine (lib/alerts/engine.ts) and engagement nudges were
-- DISPLAY-ONLY: rows landed in tables and pages rendered them, but nobody was
-- actively notified. This table backs an in-app notification feed + bell badge,
-- and (optionally) an out-of-band email via Resend.
--
-- Tenancy: same uniform model as migration 007 — a single tenant policy
--   (practice_id = current_practice_id()) for ALL ops. practice_id gets the
--   dynamic default current_practice_id() (migration 004 only touched tables
--   that existed then, so we set it explicitly here for session-client inserts).
--   Service-role inserts (alerts cron) MUST pass practice_id explicitly; the
--   NOT NULL constraint enforces that.
-- ============================================================================

create table if not exists public.notifications (
  id                       uuid primary key default gen_random_uuid(),
  practice_id              uuid not null default public.current_practice_id(),
  -- Recipient is optional: a notification can be addressed to one practitioner,
  -- one patient, or (both null) the whole practice / care team. The feed page
  -- and unread-count show practice-wide + practitioner-addressed rows.
  recipient_practitioner_id uuid,
  recipient_patient_id      uuid,
  kind                     text not null,            -- 'alert', 'nudge', 'system', ...
  title                    text not null,
  body                     text,
  link                     text,                     -- in-app deep link, e.g. '/triage'
  severity                 text not null default 'info'
                             check (severity in ('info','warn','urgent')),
  -- Alert-fatigue tuning: only urgent notifications "interrupt". Non-urgent rows
  -- ride quietly in the feed. The bell badge can choose to count only these.
  interrupt                boolean not null default false,
  read_at                  timestamptz,
  created_at               timestamptz not null default now()
);

-- Dedup for engine-driven notifications: reuse the alert dedup_key so the SAME
-- rule+patient cannot notify more than once per day (the alert layer already
-- gives daily idempotency via uq_alerts_dedup). NULL dedup_key (e.g. manual
-- notifications) is never deduped.
alter table public.notifications add column if not exists dedup_key text;
create unique index if not exists uq_notifications_dedup
  on public.notifications (practice_id, dedup_key) where dedup_key is not null;

-- Bell badge + feed query: "unread first, scoped to practice".
create index if not exists idx_notifications_unread
  on public.notifications (practice_id, read_at);

-- Tenant RLS — uniform single policy (mirrors migration 007).
alter table public.notifications enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'notifications' and policyname = 'notifications_tenant'
  ) then
    create policy notifications_tenant on public.notifications for all
      using (practice_id = public.current_practice_id())
      with check (practice_id = public.current_practice_id());
  end if;
end $$;
