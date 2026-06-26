-- 022 — Plant Medicine / Psychedelic Therapy: screenings, sessions, integration notes.

-- Contraindication screening for psychedelic-assisted therapy.
create table if not exists psychedelic_screenings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  screened_by uuid references practitioners(id),
  substance text not null,
  screening_date date not null,
  cv_hypertension boolean,
  cv_arrhythmia boolean,
  psych_schizophrenia boolean,
  psych_bipolar_i boolean,
  psych_active_psychosis boolean,
  psych_suicidal_ideation boolean,
  sub_benzodiazepine boolean,
  sub_lithium boolean,
  sub_maoi boolean,
  sub_ssri boolean,
  ibo_qt_prolongation boolean,
  ibo_liver_disease boolean,
  med_seizure_history boolean,
  med_pregnancy boolean,
  current_medications text,
  ecg_qt_ms integer,
  screening_result text check (screening_result in ('cleared','conditional','contraindicated')),
  notes text,
  created_at timestamptz not null default now()
);
alter table psychedelic_screenings enable row level security;
create policy "psychedelic_screenings_staff" on psychedelic_screenings for all using (can_access_patient(patient_id)) with check (can_access_patient(patient_id));
create policy "psychedelic_screenings_self_read" on psychedelic_screenings for select using (patient_id = current_patient_id());

-- A single therapy session (preparation, journey, integration, or follow-up).
create table if not exists psychedelic_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  practitioner_id uuid references practitioners(id),
  screening_id uuid references psychedelic_screenings(id),
  session_type text not null check (session_type in ('preparation','journey','integration','followup')),
  session_date date not null,
  substance text,
  compound text,
  route text,
  dose_mg numeric,
  patient_weight_kg numeric,
  vitals_log jsonb,
  setting_location text,
  intention_statement text,
  patient_rating integer,
  challenging_experience boolean,
  adverse_events text,
  practitioner_notes text,
  created_at timestamptz not null default now()
);
alter table psychedelic_sessions enable row level security;
create policy "psychedelic_sessions_staff" on psychedelic_sessions for all using (can_access_patient(patient_id)) with check (can_access_patient(patient_id));
create policy "psychedelic_sessions_self_read" on psychedelic_sessions for select using (patient_id = current_patient_id());

-- Structured post-session integration notes.
create table if not exists psychedelic_integration_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  session_id uuid references psychedelic_sessions(id) on delete cascade,
  days_post integer not null,
  insights text,
  challenges text,
  behavioral_changes text,
  mood_rating integer,
  sleep_quality integer,
  follow_up_plan text,
  created_at timestamptz not null default now()
);
alter table psychedelic_integration_notes enable row level security;
create policy "psychedelic_integration_notes_staff" on psychedelic_integration_notes for all using (can_access_patient(patient_id)) with check (can_access_patient(patient_id));
create policy "psychedelic_integration_notes_self_read" on psychedelic_integration_notes for select using (patient_id = current_patient_id());

grant select, insert, update, delete on psychedelic_screenings to authenticated;
grant select, insert, update, delete on psychedelic_sessions to authenticated;
grant select, insert, update, delete on psychedelic_integration_notes to authenticated;
grant all on psychedelic_screenings to service_role;
grant all on psychedelic_sessions to service_role;
grant all on psychedelic_integration_notes to service_role;

create index if not exists idx_psych_screening_patient on psychedelic_screenings(patient_id, screening_date);
create index if not exists idx_psych_session_patient on psychedelic_sessions(patient_id, session_date);
create index if not exists idx_psych_integration_session on psychedelic_integration_notes(session_id, days_post);
