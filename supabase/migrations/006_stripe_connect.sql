-- 006_stripe_connect.sql — per-tenant patient billing via Stripe Connect (Standard).
-- The SaaS subscription billing uses the platform's single Stripe account; PATIENT
-- payments must land in each CLINIC's own Stripe. We store the clinic's connected
-- account id here; the patient-invoice checkout charges on that account.
alter table public.practices add column if not exists stripe_connect_account_id text;
alter table public.practices add column if not exists stripe_connect_status text not null default 'disconnected';
alter table public.practices add column if not exists stripe_connected_at timestamptz;
