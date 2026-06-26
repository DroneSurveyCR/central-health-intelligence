-- 023 — Peptide / GLP-1 protocols, injection administrations, and e-prescribing.

-- Peptide / GLP-1 titration protocols.
create table if not exists peptide_protocols (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  prescriber_id uuid references practitioners(id),
  compound text not null,
  category text,
  route text,
  start_date date not null,
  goal text,
  current_week integer not null default 1,
  current_dose_mg numeric not null,
  titration_schedule jsonb not null default '[]',
  pharmacy_name text,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'discontinued')),
  created_at timestamptz not null default now()
);
alter table peptide_protocols enable row level security;
create policy "peptide_protocols_staff" on peptide_protocols for all
  using (can_access_patient(patient_id))
  with check (can_access_patient(patient_id));
create policy "peptide_protocols_self_read" on peptide_protocols for select
  using (patient_id = current_patient_id());
grant select, insert, update, delete on peptide_protocols to authenticated;
grant all on peptide_protocols to service_role;
create index if not exists idx_peptide_protocols_patient
  on peptide_protocols(patient_id, status);

-- Individual injection / administration events against a protocol.
create table if not exists peptide_administrations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  protocol_id uuid references peptide_protocols(id) on delete cascade,
  administered_at timestamptz not null default now(),
  administered_by text check (administered_by in ('clinic', 'self', 'home_nurse')),
  dose_mg numeric not null,
  route text,
  injection_site text,
  weight_kg numeric,
  side_effects text[],
  side_effect_severity integer,
  notes text,
  created_at timestamptz not null default now()
);
alter table peptide_administrations enable row level security;
create policy "peptide_administrations_staff" on peptide_administrations for all
  using (can_access_patient(patient_id))
  with check (can_access_patient(patient_id));
create policy "peptide_administrations_self_read" on peptide_administrations for select
  using (patient_id = current_patient_id());
grant select, insert, update, delete on peptide_administrations to authenticated;
grant all on peptide_administrations to service_role;
create index if not exists idx_peptide_administrations_protocol
  on peptide_administrations(protocol_id, administered_at);

-- e-Prescriptions (draft -> signed -> sent).
create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  prescriber_id uuid references practitioners(id),
  medication text not null,
  dose text,
  sig text,
  quantity text,
  refills integer default 0,
  pharmacy_name text,
  status text not null default 'draft'
    check (status in ('draft', 'signed', 'sent')),
  signed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table prescriptions enable row level security;
create policy "prescriptions_staff" on prescriptions for all
  using (can_access_patient(patient_id))
  with check (can_access_patient(patient_id));
create policy "prescriptions_self_read" on prescriptions for select
  using (patient_id = current_patient_id());
grant select, insert, update, delete on prescriptions to authenticated;
grant all on prescriptions to service_role;
create index if not exists idx_prescriptions_patient
  on prescriptions(patient_id, status);
