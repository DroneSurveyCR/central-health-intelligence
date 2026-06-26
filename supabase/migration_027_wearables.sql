-- 027 — Wearables & CGM: per-day device summaries (Oura/Garmin/Whoop/Dexcom/Withings/manual)
-- plus secret OAuth tokens for future connector sync (OAuth flow itself is out of scope here).

-- Daily summaries: one row per patient/connector/day with the metrics we care about.
create table if not exists wearable_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  connector_slug text not null,
  date date not null,
  resting_hr numeric,
  hrv_ms numeric,
  sleep_hours numeric,
  sleep_efficiency numeric,
  steps integer,
  readiness_score integer,
  spo2_avg numeric,
  weight_kg numeric,
  body_fat_pct numeric,
  avg_glucose_mgdl numeric,
  time_in_range_pct numeric,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (patient_id, connector_slug, date)
);
alter table wearable_daily_summaries enable row level security;
create policy "wearable_daily_summaries_staff" on wearable_daily_summaries for all using (can_access_patient(patient_id)) with check (can_access_patient(patient_id));
create policy "wearable_daily_summaries_self_read" on wearable_daily_summaries for select using (patient_id = current_patient_id());
grant select, insert, update, delete on wearable_daily_summaries to authenticated;
grant all on wearable_daily_summaries to service_role;
create index if not exists idx_wearable_daily_summaries_patient_date on wearable_daily_summaries(patient_id, date desc);

-- Connector OAuth tokens: secret credentials for syncing a connector. Staff-only —
-- patients must NOT be able to read their own tokens.
create table if not exists connector_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  connector_slug text not null,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  status text default 'connected',
  created_at timestamptz not null default now(),
  unique (patient_id, connector_slug)
);
alter table connector_oauth_tokens enable row level security;
create policy "connector_oauth_tokens_staff" on connector_oauth_tokens for all using (can_access_patient(patient_id)) with check (can_access_patient(patient_id));
grant select, insert, update, delete on connector_oauth_tokens to authenticated;
grant all on connector_oauth_tokens to service_role;
create index if not exists idx_connector_oauth_tokens_patient on connector_oauth_tokens(patient_id, connector_slug);
