-- ============================================================================
-- HealthSync Cloud — Migration 002: practice_id on every tenant table
-- ----------------------------------------------------------------------------
-- Adds `practice_id uuid NOT NULL` (NO DEFAULT) + FK + index to all 36 tenant
-- tables. NO DEFAULT is deliberate: a missing practice_id must be a hard error,
-- never a silent misfile into another tenant.
--
-- Pattern per table: add nullable -> backfill to practice #1 -> set NOT NULL.
-- This is safe whether the table is empty (fresh Cloud DB; backfill is a no-op,
-- NOT NULL applies immediately) or already holds Randi's ETL'd data (backfill
-- sets it). After this migration, every INSERT must supply practice_id explicitly.
--
-- GLOBAL tables deliberately EXCLUDED (not tenant-scoped):
--   connector_registry  — shared catalog of available connectors
--   rate_limits         — infra, keyed by arbitrary string
--   practices           — the tenant root itself
-- ============================================================================

do $$
declare
  t text;
  elev8 constant uuid := '11111111-1111-1111-1111-111111111111';
  tenant_tables constant text[] := array[
    'agreements','appointments','articles','audit_logs','audit_logs_ai',
    'body_composition','body_map_findings','data_requests','email_log','files',
    'health_data_imports','intake_forms','invoice_items','invoices','lab_results',
    'locations','messages','orders','patient_insurance','patient_labels',
    'patients','payments','plan_completions','plan_items','plan_phases',
    'plans','practice_connectors','practice_settings','practitioners','products',
    'progress_logs','role_assignments','scans','services','visits','waitlist_entries'
  ];
begin
  foreach t in array tenant_tables loop
    -- 1. add column (nullable first)
    execute format('alter table public.%I add column if not exists practice_id uuid', t);
    -- 2. backfill existing rows to Casa Elev8 (no-op on an empty fresh DB)
    execute format('update public.%I set practice_id = %L where practice_id is null', t, elev8);
    -- 3. enforce NOT NULL (no default)
    execute format('alter table public.%I alter column practice_id set not null', t);
    -- 4. FK to practices (guarded so the migration is safe to re-run)
    if not exists (select 1 from pg_constraint where conname = t || '_practice_id_fkey') then
      execute format(
        'alter table public.%I add constraint %I foreign key (practice_id) references public.practices(id) on delete cascade',
        t, t || '_practice_id_fkey'
      );
    end if;
    -- 5. index for RLS performance
    execute format('create index if not exists %I on public.%I(practice_id)', 'idx_' || t || '_practice_id', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- practice_settings was a singleton (a `singleton` column with a unique constraint).
-- In multi-tenant it becomes one settings row PER practice. Dropping the `singleton`
-- column with CASCADE removes the column and any dependent unique constraint/index
-- in one robust step (safe whether or not the column exists). Then enforce one
-- settings row per practice.
-- (The `practices.settings` jsonb is the long-term home; practice_settings is kept
-- per-practice for backward-compat with existing app code that reads it.)
-- ----------------------------------------------------------------------------
alter table public.practice_settings drop column if exists singleton cascade;

create unique index if not exists uq_practice_settings_practice on public.practice_settings(practice_id);
