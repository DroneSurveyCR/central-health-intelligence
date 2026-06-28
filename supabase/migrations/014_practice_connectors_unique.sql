-- 014_practice_connectors_unique.sql
-- Tenant-safety: practice_connectors must be unique per (practice_id, connector_id),
-- NOT globally per connector_id. A global unique on connector_id let one tenant's
-- upsert collide with — and overwrite — another tenant's connector config.
--
-- App code no longer depends on a specific unique index (it resolves the row by
-- (practice_id, connector_id) explicitly), so this migration is defense-in-depth:
-- it makes the database enforce the tenant boundary too. Safe to apply anytime.
--
-- Idempotent. Drops any unique constraint/index keyed on connector_id alone, then
-- adds the composite unique. With a single live tenant there can be no duplicate
-- (practice_id, connector_id) rows, so this cannot fail on existing data.

do $$
declare
  r record;
begin
  -- Drop unique CONSTRAINTS whose definition is exactly UNIQUE (connector_id).
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.practice_connectors'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (connector_id)'
  loop
    execute format('alter table public.practice_connectors drop constraint %I', r.conname);
  end loop;

  -- Drop standalone unique INDEXES on (connector_id) that aren't backing a constraint.
  for r in
    select i.relname as idxname
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class t on t.oid = x.indrelid
    where t.relname = 'practice_connectors'
      and x.indisunique
      and not x.indisprimary
      and x.indnatts = 1
      and pg_get_indexdef(x.indexrelid) like '%(connector_id)%'
      and not exists (select 1 from pg_constraint c where c.conindid = x.indexrelid)
  loop
    execute format('drop index if exists public.%I', r.idxname);
  end loop;
end $$;

create unique index if not exists practice_connectors_practice_connector_uq
  on public.practice_connectors (practice_id, connector_id);
