-- ============================================================================
-- Migration 021: SOAP note draft/finalized state on visits.
-- ----------------------------------------------------------------------------
-- Adds a lifecycle to visit notes: 'draft' (editable) -> 'finalized' (locked).
-- App-level enforcement prevents finalizing twice / editing a finalized note;
-- the optional trigger below also blocks UPDATEs to a finalized visit's content
-- at the DB layer for defense-in-depth.
-- ============================================================================

alter table public.visits
  add column if not exists status text not null default 'draft'
    check (status in ('draft','finalized'));

alter table public.visits
  add column if not exists finalized_at timestamptz;

alter table public.visits
  add column if not exists finalized_by uuid references public.practitioners(id) on delete set null;

-- Defense-in-depth: once finalized, content (summary/modalities) and status are locked.
create or replace function public.lock_finalized_visit()
returns trigger language plpgsql as $$
begin
  if old.status = 'finalized' then
    -- allow only soft-delete (deleted_at) on a finalized note; block content/status edits
    if new.summary is distinct from old.summary
       or new.modalities_json is distinct from old.modalities_json
       or new.status is distinct from old.status
       or new.visit_date is distinct from old.visit_date then
      raise exception 'visit % is finalized and cannot be edited', old.id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_finalized_visit on public.visits;
create trigger trg_lock_finalized_visit
  before update on public.visits
  for each row execute function public.lock_finalized_visit();
