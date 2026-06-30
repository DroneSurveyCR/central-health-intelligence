-- ============================================================================
-- Central Health Intelligence — Migration 017: reseller referral on leads
-- ----------------------------------------------------------------------------
-- Adds a free-text `ref` (referral code) to leads so resellers get credit for
-- the prospects they send via `?ref=CODE` links or by entering a code on the
-- intake form. Additive; service-role only (leads has RLS on, no policies).
-- ============================================================================

alter table public.leads add column if not exists ref text;
create index if not exists idx_leads_ref on public.leads (ref) where ref is not null;
