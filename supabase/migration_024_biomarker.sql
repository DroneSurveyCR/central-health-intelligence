-- 024 — Labs / Biomarker Panels: longevity-style panels with optimal ranges + biological age.

create table if not exists biomarker_panels (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  panel_name text not null,
  drawn_at date not null,
  lab_name text,
  source_type text,
  -- jsonb array of { name, value, unit, ref_low, ref_high, optimal_low, optimal_high }
  markers jsonb not null default '[]',
  biological_age numeric,
  chronological_age integer,
  notes text,
  created_at timestamptz not null default now()
);
alter table biomarker_panels enable row level security;
create policy "biomarker_panels_staff" on biomarker_panels for all using (can_access_patient(patient_id)) with check (can_access_patient(patient_id));
create policy "biomarker_panels_self_read" on biomarker_panels for select using (patient_id = current_patient_id());

grant select, insert, update, delete on biomarker_panels to authenticated;
grant all on biomarker_panels to service_role;
create index if not exists idx_biomarker_patient_drawn on biomarker_panels(patient_id, drawn_at desc);
