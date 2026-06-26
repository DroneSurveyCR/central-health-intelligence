-- 025 — Nutrition & Food Intake: patient-loggable food/supplement diaries + practitioner nutrition protocols.

-- Food logs: a meal/snack with a jsonb array of foods and computed macro totals.
create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_type text,
  -- jsonb array of { name, qty, unit, kcal, protein_g, carb_g, fat_g }
  foods jsonb not null default '[]',
  total_kcal numeric,
  total_protein_g numeric,
  total_carb_g numeric,
  total_fat_g numeric,
  notes text,
  source text default 'manual',
  created_at timestamptz not null default now()
);
alter table food_logs enable row level security;
create policy "food_logs_staff" on food_logs for all using (can_access_patient(patient_id)) with check (can_access_patient(patient_id));
create policy "food_logs_self" on food_logs for all using (patient_id = current_patient_id()) with check (patient_id = current_patient_id());
grant select, insert, update, delete on food_logs to authenticated;
grant all on food_logs to service_role;
create index if not exists idx_food_logs_patient_logged on food_logs(patient_id, logged_at desc);

-- Supplement logs: a single supplement intake event.
create table if not exists supplement_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  logged_at timestamptz not null default now(),
  supplement_name text not null,
  dose text,
  timing text,
  brand text,
  notes text,
  created_at timestamptz not null default now()
);
alter table supplement_logs enable row level security;
create policy "supplement_logs_staff" on supplement_logs for all using (can_access_patient(patient_id)) with check (can_access_patient(patient_id));
create policy "supplement_logs_self" on supplement_logs for all using (patient_id = current_patient_id()) with check (patient_id = current_patient_id());
grant select, insert, update, delete on supplement_logs to authenticated;
grant all on supplement_logs to service_role;
create index if not exists idx_supplement_logs_patient_logged on supplement_logs(patient_id, logged_at desc);

-- Nutrition protocols: a practitioner-authored dietary plan for a patient.
create table if not exists nutrition_protocols (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  practitioner_id uuid references practitioners(id),
  protocol_name text not null,
  diet_type text,
  daily_targets jsonb,
  foods_to_avoid text[],
  foods_to_emphasize text[],
  meal_timing text,
  notes text,
  active boolean default true,
  start_date date,
  created_at timestamptz not null default now()
);
alter table nutrition_protocols enable row level security;
create policy "nutrition_protocols_staff" on nutrition_protocols for all using (can_access_patient(patient_id)) with check (can_access_patient(patient_id));
create policy "nutrition_protocols_self" on nutrition_protocols for all using (patient_id = current_patient_id()) with check (patient_id = current_patient_id());
grant select, insert, update, delete on nutrition_protocols to authenticated;
grant all on nutrition_protocols to service_role;
create index if not exists idx_nutrition_protocols_patient_active on nutrition_protocols(patient_id, active);
