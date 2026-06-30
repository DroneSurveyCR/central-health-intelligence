-- ============================================================================
-- Central Health Intelligence — Migration 016: marketing leads
-- ----------------------------------------------------------------------------
-- Captures intake from the public marketing site ("get a demo / pricing / the
-- software"): basic contact, then which vertical + what options they need.
-- These are PRE-SIGNUP — NOT tenant data, so there is NO practice_id.
--
-- RLS is enabled with NO policies: anon/authenticated users can't read or write.
-- Inserts come only from the public /api/lead route via the service-role client
-- (bypasses RLS), and the platform operator reads via the same service-role path.
-- ============================================================================

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  phone       text,
  clinic      text,
  vertical    text,                              -- slug, e.g. 'bioresonance'
  intent      text not null default 'demo'
                check (intent in ('demo','pricing','get_started')),
  options     text[] not null default '{}',      -- what they said they need
  message     text,
  source      text                               -- e.g. 'contact', 'pricing'
);

create index if not exists idx_leads_created on public.leads (created_at desc);

alter table public.leads enable row level security;
-- Intentionally no policies — service-role only.
