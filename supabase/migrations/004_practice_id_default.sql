-- ============================================================================
-- Migration 004 — practice_id default = current_practice_id()
-- ----------------------------------------------------------------------------
-- The app code (seeded from a single-tenant app) does not set practice_id on
-- inserts, but practice_id is NOT NULL on every tenant table. Give it a DYNAMIC
-- default of current_practice_id() so a logged-in user's insert auto-fills THEIR
-- OWN practice. This is safe:
--   - It can never cross tenants (it resolves to the caller's practice only).
--   - The RLS with-check (practice_id = current_practice_id()) still rejects any
--     explicit wrong value, so the default doesn't weaken isolation.
--   - Service-role inserts (auth.uid() null -> default null) must still set
--     practice_id explicitly (ETL/onboarding/audit already do) — the NOT NULL
--     constraint enforces that.
-- This is NOT a static default (the dangerous kind that misfiles to one tenant).
-- ============================================================================

do $$
declare t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'practice_id'
  loop
    execute format('alter table public.%I alter column practice_id set default public.current_practice_id()', t);
  end loop;
end $$;
