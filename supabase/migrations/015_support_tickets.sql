-- ============================================================================
-- Central Health Intelligence — Migration 015: client support tickets
-- ----------------------------------------------------------------------------
-- Lets a clinic (the SaaS customer) raise problems, ask for help, and request
-- customizations from inside the dashboard, and track status + a reply thread.
-- Each ticket optionally mirrors to a GitHub issue (github_issue_*) so the
-- platform team tracks + fixes them in the repo.
--
-- Tenancy: uniform model (migration 007/011) — practice_id NOT NULL with the
-- dynamic default current_practice_id(), single tenant RLS policy for ALL ops.
-- The platform operator reads across tenants via the service-role admin client
-- (superadmin), which bypasses RLS.
-- ============================================================================

create table if not exists public.support_tickets (
  id                  uuid primary key default gen_random_uuid(),
  practice_id         uuid not null default public.current_practice_id(),
  subject             text not null,
  body                text,
  category            text not null default 'problem'
                        check (category in ('problem','help','customization','other')),
  status              text not null default 'open'
                        check (status in ('open','in_progress','resolved','closed')),
  priority            text not null default 'normal'
                        check (priority in ('low','normal','high','urgent')),
  created_by          uuid,                 -- practitioner who opened it
  github_issue_number integer,              -- mirrored GitHub issue (nullable)
  github_issue_url    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_support_tickets_practice_status
  on public.support_tickets (practice_id, status, created_at desc);

create table if not exists public.ticket_messages (
  id                    uuid primary key default gen_random_uuid(),
  practice_id           uuid not null default public.current_practice_id(),
  ticket_id             uuid not null references public.support_tickets(id) on delete cascade,
  -- 'clinic' = the customer's staff; 'support' = the platform operator.
  author_kind           text not null default 'clinic'
                          check (author_kind in ('clinic','support')),
  author_practitioner_id uuid,
  body                  text not null,
  created_at            timestamptz not null default now()
);

create index if not exists idx_ticket_messages_ticket
  on public.ticket_messages (ticket_id, created_at);

-- Tenant RLS — uniform single policy (mirrors migration 007/011).
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'support_tickets' and policyname = 'support_tickets_tenant') then
    create policy support_tickets_tenant on public.support_tickets for all
      using (practice_id = public.current_practice_id())
      with check (practice_id = public.current_practice_id());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ticket_messages' and policyname = 'ticket_messages_tenant') then
    create policy ticket_messages_tenant on public.ticket_messages for all
      using (practice_id = public.current_practice_id())
      with check (practice_id = public.current_practice_id());
  end if;
end $$;
