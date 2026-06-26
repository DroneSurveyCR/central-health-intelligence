-- 026 — Longevity & Biological Age: recorded biological-age scores over time.
-- READS from biomarker_panels (migration 024). This migration only adds the
-- scores table; the dashboard derives bio-age from panels via lib/longevity.

create table if not exists biological_age_scores (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  score_date date not null,
  biological_age numeric not null,
  chronological_age integer not null,
  delta numeric,
  algorithm text,
  marker_inputs jsonb,
  notes text,
  created_at timestamptz not null default now()
);

alter table biological_age_scores enable row level security;
create policy "biological_age_scores_staff" on biological_age_scores for all using (can_access_patient(patient_id)) with check (can_access_patient(patient_id));
create policy "biological_age_scores_self_read" on biological_age_scores for select using (patient_id = current_patient_id());

grant select, insert, update, delete on biological_age_scores to authenticated;
grant all on biological_age_scores to service_role;
create index if not exists idx_bioage_patient_date on biological_age_scores(patient_id, score_date desc);
