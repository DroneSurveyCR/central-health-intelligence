-- ============================================================================
-- HealthSync Cloud — Migration 012: append-only (WORM) audit logs
-- ----------------------------------------------------------------------------
-- HIPAA requires that audit/access records be tamper-evident and retained.
-- The Security Rule (45 CFR § 164.312(b)) mandates audit controls, and the
-- documentation-retention rule (45 CFR § 164.316(b)(2)(i)) requires records to
-- be kept for SIX YEARS from creation (or last-in-effect date). To satisfy
-- "tamper-evident", audit rows must be WRITE-ONCE / READ-MANY (WORM): they may
-- be INSERTed and SELECTed, but NEVER UPDATEd or DELETEd by application roles.
--
-- This migration revokes UPDATE/DELETE on the audit tables from the anon and
-- authenticated roles (the only roles a session-bound Supabase client ever
-- uses). INSERT + SELECT remain, gated by the existing RLS policies from
-- migration 003. The service_role / postgres owner is intentionally left able
-- to manage retention/purges out-of-band after the 6-year window.
--
-- Defensive: guarded by to_regclass() so it is safe to re-run and safe even if
-- audit_logs_ai is absent in some environment.
-- ============================================================================

do $$
begin
  -- audit_logs (PHI access trail) ------------------------------------------
  if to_regclass('public.audit_logs') is not null then
    revoke update, delete on public.audit_logs from anon, authenticated;
    comment on table public.audit_logs is
      'WORM / append-only audit trail (HIPAA 45 CFR 164.312(b)). '
      'INSERT + SELECT only for app roles; UPDATE/DELETE revoked from '
      'anon + authenticated. Retain >= 6 years (45 CFR 164.316(b)(2)(i)); '
      'purges only via service_role after the retention window.';
  end if;

  -- audit_logs_ai (AI-action trail) ----------------------------------------
  if to_regclass('public.audit_logs_ai') is not null then
    revoke update, delete on public.audit_logs_ai from anon, authenticated;
    comment on table public.audit_logs_ai is
      'WORM / append-only AI-action audit trail (HIPAA 45 CFR 164.312(b)). '
      'INSERT + SELECT only for app roles; UPDATE/DELETE revoked from '
      'anon + authenticated. Retain >= 6 years (45 CFR 164.316(b)(2)(i)); '
      'purges only via service_role after the retention window.';
  end if;
end $$;
