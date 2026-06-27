-- 009 — Dispensary: practitioner supplement recommendations to a patient.
-- One row = one recommended product (from the practice catalog) + a dosage note.
-- Tenant-scoped via practice_id default current_practice_id(); patient may read
-- their own recommendations, staff may read/write within their practice.
-- NOTE: numbered _009 to sit alongside the supabase/ root migrations (021+ already
-- exist); apply manually — Nick will run this.

create table if not exists public.supplement_recommendations (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null default public.current_practice_id(),
  patient_id    uuid not null references patients(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  product_name  text not null,
  dosage_note   text,
  recommended_by uuid references practitioners(id),
  created_at    timestamptz not null default now()
);

-- defensive add-column-if-not-exists (converges regardless of prior state)
alter table public.supplement_recommendations add column if not exists practice_id    uuid not null default public.current_practice_id();
alter table public.supplement_recommendations add column if not exists product_id     uuid;
alter table public.supplement_recommendations add column if not exists product_name   text;
alter table public.supplement_recommendations add column if not exists dosage_note    text;
alter table public.supplement_recommendations add column if not exists recommended_by uuid;

alter table public.supplement_recommendations enable row level security;

-- Staff: full access within their practice AND only for patients they can access.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'supplement_recommendations'
      and policyname = 'supplement_recommendations_staff'
  ) then
    create policy supplement_recommendations_staff
      on public.supplement_recommendations
      for all
      using (
        practice_id = public.current_practice_id()
        and can_access_patient(patient_id)
      )
      with check (
        practice_id = public.current_practice_id()
        and can_access_patient(patient_id)
      );
  end if;

  -- Patient: read their own recommendations.
  if not exists (
    select 1 from pg_policies
    where tablename = 'supplement_recommendations'
      and policyname = 'supplement_recommendations_self_read'
  ) then
    create policy supplement_recommendations_self_read
      on public.supplement_recommendations
      for select
      using (patient_id = public.current_patient_id());
  end if;
end $$;

grant select, insert, update, delete on public.supplement_recommendations to authenticated;
grant all on public.supplement_recommendations to service_role;

create index if not exists idx_supplement_recommendations_patient
  on public.supplement_recommendations(patient_id, created_at desc);
