-- ============================================================================
-- HealthSync Cloud — Migration 001: practices (the tenant root)
-- ----------------------------------------------------------------------------
-- Creates the `practices` table that replaces the single-tenant `practice_settings`
-- singleton as the anchor of tenancy, and seeds Casa Elev8 (Dr. Randi) as practice #1.
--
-- RLS is enabled here but its POLICIES are defined in 003 (they depend on the
-- `current_practice_id()` helper, which depends on the practice_id columns added in 002).
-- Between 001 and 003 `practices` is therefore deny-all — migrations run as a set.
-- ============================================================================

create table if not exists public.practices (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text unique not null,
  name                    text not null,
  plan                    text not null default 'starter'
                            check (plan in ('starter','growth','network','enterprise')),
  vertical                text,                 -- 'integrative','longevity','peptide','psychedelic','functional','womens'
  region                  text not null default 'us'  -- data residency: 'us','eu','ca'
                            check (region in ('us','eu','ca')),
  subdomain               text unique,
  custom_domain           text unique,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  owner_id                uuid references auth.users(id) on delete set null,
  settings                jsonb not null default '{}'::jsonb,   -- absorbs practice_settings detail
  modules                 text[] not null default '{}',         -- enabled module ids
  trial_ends_at           timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.practices is
  'Tenant root. One row per clinic. modules[] drives feature gating; region drives data residency.';

-- ----------------------------------------------------------------------------
-- Seed Tenant #1 — Casa Elev8 (Dr. Randi Raymond). Fixed UUID so the ETL and all
-- backfills reference the same id deterministically.
-- ----------------------------------------------------------------------------
insert into public.practices (id, slug, name, plan, vertical, region, modules)
values (
  '11111111-1111-1111-1111-111111111111',
  'casa-elev8',
  'Casa Elev8',
  'network',
  'integrative',
  'us',
  array[
    'scheduling','billing','portal','reports',          -- default-on platform-adjacent
    'labs','wearables','weight','nutrition',             -- data modules
    'peptide','psychedelic','longevity',                 -- Randi's verticals
    'engagement'                                          -- patient retention engine
  ]
)
on conflict (id) do nothing;

alter table public.practices enable row level security;
