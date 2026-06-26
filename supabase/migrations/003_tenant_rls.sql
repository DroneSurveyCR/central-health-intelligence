-- ============================================================================
-- HealthSync Cloud — Migration 003: tenant-aware RLS
-- ----------------------------------------------------------------------------
-- Three moves:
--   A. Add helpers: current_practice_id(), practice_has_module().
--   B. Make can_access_patient() PRACTICE-AWARE. This is the keystone: ~18 staff
--      policies call can_access_patient(patient_id), so they become tenant-safe
--      automatically with this one change. Those policies are NOT touched below.
--   C. Hand-rewrite the genuine gaps — every policy that used is_staff()/is_admin()/
--      a public `true`/`active` read with NO practice scope, plus the 4 join/child
--      tables (body_map_findings, invoice_items, plan_items, plan_phases) whose
--      EXISTS-join to a parent is the classic cross-tenant leak surface.
--
-- Patient-self policies of the form (patient_id = current_patient_id()) are left
-- as-is: current_patient_id() resolves to the caller's own practice-bound patient
-- row, so they are inherently single-tenant-safe. See QA.md for the proof.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. Tenant helpers
-- ----------------------------------------------------------------------------
create or replace function public.current_practice_id() returns uuid
  language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  -- staff identity first, then patient identity. A given auth user maps to one row.
  select coalesce(
    (select practice_id from practitioners where auth_user_id = auth.uid() and active limit 1),
    (select practice_id from patients     where auth_user_id = auth.uid() and deleted_at is null limit 1)
  );
$$;

create or replace function public.practice_has_module(m text) returns boolean
  language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select coalesce(
    (select modules @> array[m] from practices where id = public.current_practice_id()),
    false);
$$;

-- ----------------------------------------------------------------------------
-- B. Keystone: practice-aware can_access_patient()
--    (was: doctor/admin -> TRUE for ANY patient. Now scoped to current practice.)
-- ----------------------------------------------------------------------------
create or replace function public.can_access_patient(p uuid) returns boolean
  language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select case
    when public.current_role_name() in ('doctor','admin') then exists (
      select 1 from patients pt
      where pt.id = p
        and pt.practice_id = public.current_practice_id())
    when public.current_role_name() = 'assistant' then exists (
      select 1 from patients pt
      where pt.id = p
        and pt.practice_id = public.current_practice_id()
        and pt.assigned_practitioner_id = public.current_practitioner_id())
    else false
  end;
$$;

-- ----------------------------------------------------------------------------
-- practices table policies
-- ----------------------------------------------------------------------------
drop policy if exists practices_staff_read   on public.practices;
create policy practices_staff_read on public.practices for select
  using (id = public.current_practice_id());

drop policy if exists practices_admin_update on public.practices;
create policy practices_admin_update on public.practices for update
  using (id = public.current_practice_id() and public.is_admin())
  with check (id = public.current_practice_id() and public.is_admin());
-- (INSERT/creation of a practice is performed by the onboarding flow via the
--  service-role client, which bypasses RLS. No insert policy = deny for users.)

-- ============================================================================
-- C. Gap fixes — catalog / practice-level tables (used is_staff/is_admin/true/active)
-- ============================================================================

-- articles
drop policy if exists articles_admin_write on public.articles;
create policy articles_admin_write on public.articles for all
  using (public.is_admin() and practice_id = public.current_practice_id())
  with check (public.is_admin() and practice_id = public.current_practice_id());
drop policy if exists articles_public_read on public.articles;
create policy articles_public_read on public.articles for select
  using (practice_id = public.current_practice_id() and (published or public.is_staff()));

-- locations
drop policy if exists loc_admin_write on public.locations;
create policy loc_admin_write on public.locations for all
  using (public.is_admin() and practice_id = public.current_practice_id())
  with check (public.is_admin() and practice_id = public.current_practice_id());
drop policy if exists loc_public_read on public.locations;
create policy loc_public_read on public.locations for select
  using (practice_id = public.current_practice_id() and (active or public.is_staff()));

-- services
drop policy if exists svc_admin_write on public.services;
create policy svc_admin_write on public.services for all
  using (public.is_admin() and practice_id = public.current_practice_id())
  with check (public.is_admin() and practice_id = public.current_practice_id());
drop policy if exists svc_public_read on public.services;
create policy svc_public_read on public.services for select
  using (practice_id = public.current_practice_id() and (active or public.is_staff()));

-- products
drop policy if exists prod_admin_write on public.products;
create policy prod_admin_write on public.products for all
  using (public.is_admin() and practice_id = public.current_practice_id())
  with check (public.is_admin() and practice_id = public.current_practice_id());
drop policy if exists prod_public_read on public.products;
create policy prod_public_read on public.products for select
  using (practice_id = public.current_practice_id());

-- practitioners
drop policy if exists prac_admin_write on public.practitioners;
create policy prac_admin_write on public.practitioners for all
  using (public.is_admin() and practice_id = public.current_practice_id())
  with check (public.is_admin() and practice_id = public.current_practice_id());
drop policy if exists prac_staff_read on public.practitioners;
create policy prac_staff_read on public.practitioners for select
  using (public.is_staff() and practice_id = public.current_practice_id());

-- role_assignments (child of practitioners; now has its own practice_id)
drop policy if exists ra_admin_write on public.role_assignments;
create policy ra_admin_write on public.role_assignments for all
  using (public.is_admin() and practice_id = public.current_practice_id())
  with check (public.is_admin() and practice_id = public.current_practice_id());
drop policy if exists ra_staff_read on public.role_assignments;
create policy ra_staff_read on public.role_assignments for select
  using (public.is_staff() and practice_id = public.current_practice_id());

-- practice_connectors
drop policy if exists practice_connectors_admin_write on public.practice_connectors;
create policy practice_connectors_admin_write on public.practice_connectors for all
  using (public.is_admin() and practice_id = public.current_practice_id())
  with check (public.is_admin() and practice_id = public.current_practice_id());
drop policy if exists practice_connectors_staff_read on public.practice_connectors;
create policy practice_connectors_staff_read on public.practice_connectors for select
  using (public.is_staff() and practice_id = public.current_practice_id());

-- practice_settings (was singleton public read `true`)
drop policy if exists ps_admin_write on public.practice_settings;
create policy ps_admin_write on public.practice_settings for all
  using (public.is_admin() and practice_id = public.current_practice_id())
  with check (public.is_admin() and practice_id = public.current_practice_id());
drop policy if exists ps_public_read on public.practice_settings;
create policy ps_public_read on public.practice_settings for select
  using (practice_id = public.current_practice_id());

-- ============================================================================
-- C. Gap fixes — patient-bound tables that used is_staff()/is_admin() directly
--    (these never went through can_access_patient, so they had no practice scope)
-- ============================================================================

-- body_composition
drop policy if exists body_comp_staff on public.body_composition;
create policy body_comp_staff on public.body_composition for all
  using (public.is_staff() and practice_id = public.current_practice_id())
  with check (public.is_staff() and practice_id = public.current_practice_id());
-- body_comp_patient (patient self) left as-is: safe via current_patient_id()

-- patient_insurance
drop policy if exists staff_all on public.patient_insurance;
create policy patient_insurance_staff on public.patient_insurance for all
  using (public.is_staff() and practice_id = public.current_practice_id())
  with check (public.is_staff() and practice_id = public.current_practice_id());

-- waitlist_entries
drop policy if exists staff_all on public.waitlist_entries;
create policy waitlist_staff on public.waitlist_entries for all
  using (public.is_staff() and practice_id = public.current_practice_id())
  with check (public.is_staff() and practice_id = public.current_practice_id());

-- data_requests (staff read; patient self left as-is)
drop policy if exists dr_staff_read on public.data_requests;
create policy dr_staff_read on public.data_requests for select
  using (public.is_staff() and practice_id = public.current_practice_id());

-- email_log
drop policy if exists email_staff on public.email_log;
create policy email_staff on public.email_log for select
  using (public.is_staff() and practice_id = public.current_practice_id());
drop policy if exists email_insert on public.email_log;
create policy email_insert on public.email_log for insert
  with check (auth.uid() is not null and practice_id = public.current_practice_id());

-- audit_logs
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select
  using (public.is_admin() and practice_id = public.current_practice_id());
drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs for insert
  with check (auth.uid() is not null and practice_id = public.current_practice_id());

-- audit_logs_ai
drop policy if exists audit_ai_read on public.audit_logs_ai;
create policy audit_ai_read on public.audit_logs_ai for select
  using (public.is_admin() and practice_id = public.current_practice_id());
drop policy if exists audit_ai_insert on public.audit_logs_ai;
create policy audit_ai_insert on public.audit_logs_ai for insert
  with check (public.is_staff() and practice_id = public.current_practice_id());

-- health_data_imports (hdi_staff_read uses can_access_patient -> auto-safe, left as-is)
drop policy if exists hdi_staff_insert on public.health_data_imports;
create policy hdi_staff_insert on public.health_data_imports for insert
  with check (public.is_staff() and practice_id = public.current_practice_id());
drop policy if exists hdi_staff_update on public.health_data_imports;
create policy hdi_staff_update on public.health_data_imports for update
  using (public.is_staff() and practice_id = public.current_practice_id())
  with check (public.is_staff() and practice_id = public.current_practice_id());
drop policy if exists hdi_admin_delete on public.health_data_imports;
create policy hdi_admin_delete on public.health_data_imports for delete
  using (public.is_admin() and practice_id = public.current_practice_id());

-- ============================================================================
-- C. Gap fixes — join/child tables (the EXISTS-join leak surface).
--    Each now has its own practice_id (from 002); assert it AND keep the parent
--    join for the access check. Belt-and-suspenders: direct practice scope +
--    parent's can_access_patient()/current_patient_id().
-- ============================================================================

-- body_map_findings (parent: scans)
drop policy if exists bmf_self_read on public.body_map_findings;
create policy bmf_self_read on public.body_map_findings for select
  using (practice_id = public.current_practice_id() and exists (
    select 1 from public.scans s
    where s.id = body_map_findings.scan_id and s.patient_id = public.current_patient_id()));
drop policy if exists body_map_findings_staff on public.body_map_findings;
create policy body_map_findings_staff on public.body_map_findings for all
  using (practice_id = public.current_practice_id() and exists (
    select 1 from public.scans s
    where s.id = body_map_findings.scan_id and public.can_access_patient(s.patient_id)))
  with check (practice_id = public.current_practice_id() and exists (
    select 1 from public.scans s
    where s.id = body_map_findings.scan_id and public.can_access_patient(s.patient_id)));

-- invoice_items (parent: invoices)
drop policy if exists invoice_items_self_read on public.invoice_items;
create policy invoice_items_self_read on public.invoice_items for select
  using (practice_id = public.current_practice_id() and exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and i.patient_id = public.current_patient_id()));
drop policy if exists invoice_items_staff on public.invoice_items;
create policy invoice_items_staff on public.invoice_items for all
  using (practice_id = public.current_practice_id() and exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and public.can_access_patient(i.patient_id)))
  with check (practice_id = public.current_practice_id() and exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and public.can_access_patient(i.patient_id)));

-- plan_items (parent: plans)
drop policy if exists plan_items_self_read on public.plan_items;
create policy plan_items_self_read on public.plan_items for select
  using (practice_id = public.current_practice_id() and exists (
    select 1 from public.plans p
    where p.id = plan_items.plan_id and p.patient_id = public.current_patient_id()));
drop policy if exists plan_items_staff on public.plan_items;
create policy plan_items_staff on public.plan_items for all
  using (practice_id = public.current_practice_id() and exists (
    select 1 from public.plans p
    where p.id = plan_items.plan_id and public.can_access_patient(p.patient_id)))
  with check (practice_id = public.current_practice_id() and exists (
    select 1 from public.plans p
    where p.id = plan_items.plan_id and public.can_access_patient(p.patient_id)));

-- plan_phases (parent: plans)
drop policy if exists plan_phases_self_read on public.plan_phases;
create policy plan_phases_self_read on public.plan_phases for select
  using (practice_id = public.current_practice_id() and exists (
    select 1 from public.plans p
    where p.id = plan_phases.plan_id and p.patient_id = public.current_patient_id()));
drop policy if exists plan_phases_staff on public.plan_phases;
create policy plan_phases_staff on public.plan_phases for all
  using (practice_id = public.current_practice_id() and exists (
    select 1 from public.plans p
    where p.id = plan_phases.plan_id and public.can_access_patient(p.patient_id)))
  with check (practice_id = public.current_practice_id() and exists (
    select 1 from public.plans p
    where p.id = plan_phases.plan_id and public.can_access_patient(p.patient_id)));

-- ============================================================================
-- NOTE: connector_registry stays global (public read), rate_limits stays infra.
-- All can_access_patient-based staff policies (appointments, agreements, files,
-- intake, invoices, lab_results, messages, orders, patients, payments,
-- plan_completions, plans, progress_logs, scans, visits, hdi_staff_read) are now
-- tenant-safe via the move-B keystone and are intentionally left untouched.
-- ============================================================================
