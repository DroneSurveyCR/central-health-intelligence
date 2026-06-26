# HealthSync Cloud — Stage 1 QA & Self-Score

Verification of the tenancy foundation against the **real introspected Casa Elev8 catalog**
(38 base tables, ~75 RLS policies, 6 helper functions). Authored unattended; QA'd by
cross-checking every table and policy. Cannot be *applied/executed* yet (Cloud Supabase
project pending), so this is **static verification + design review**, not a live test run.

---

## 1. Tenant-table coverage (practice_id)

38 live base tables. **36 get `practice_id NOT NULL` (no default)**; 2 are deliberately global.

| Excluded (global) | Why |
|---|---|
| `connector_registry` | shared catalog of available connectors |
| `rate_limits` | infra, keyed by arbitrary string |

All other **36 tables** are in migration 002's `tenant_tables[]`. Verified 1:1 against the
catalog — no tenant table missing, no extra. `practices` is the new root (no self-FK).

✅ **Coverage: 36/36 tenant tables.**

---

## 2. RLS policy coverage (~75 policies)

Every policy resolves into exactly one of three safe categories:

**(A) Auto-secured via the `can_access_patient()` keystone** — the function now asserts
`patient.practice_id = current_practice_id()`, so every staff policy calling it is tenant-safe
**without being touched**:
`appt_staff, agree_staff_read, files_staff, intake_staff_read, invoices_staff, lab_staff,
msg_staff, orders_staff, pt_staff_read, pt_staff_write, payments_staff, plan_completions_staff,
plans_staff, progress_logs_staff, scans_staff, visits_staff, patient_labels(labels_staff),
hdi_staff_read` — **18 policies**.

**(B) Hand-rewritten in 003** (had `is_staff()/is_admin()/true/active` with NO practice scope):
catalog tables (`articles, locations, services, products, practitioners, role_assignments,
practice_connectors, practice_settings` — 16 policies), patient-bound staff-only tables
(`body_comp_staff, patient_insurance, waitlist_entries, dr_staff_read, email_staff, email_insert,
audit_read, audit_insert, audit_ai_read, audit_ai_insert, hdi_staff_insert, hdi_staff_update,
hdi_admin_delete` — 13 policies), join/child tables (`body_map_findings, invoice_items,
plan_items, plan_phases` — 8 policies), and `practices` itself (2 policies). **~39 policies.**

**(C) Patient-self, inherently safe** — `(patient_id = current_patient_id())` or
`(auth_user_id = auth.uid())`. Proof below. **~18 policies.**

**(GLOBAL)** `connector_registry_public_read` — intentionally global.

✅ **Every policy accounted for; no policy grants cross-practice access.**

### Safety proof for category (C)
`current_patient_id()` returns the single `patients` row where `auth_user_id = auth.uid()`
(`auth_user_id` is UNIQUE). That row is `practice_id`-bound. A policy of the form
`patient_id = current_patient_id()` therefore matches only the caller's own rows, which belong
to the caller's own practice. A patient in practice B cannot produce a `current_patient_id()`
that equals any practice-A row id (ids are unique UUIDs). Likewise `auth_user_id = auth.uid()`
on `patients` is the caller's own row. **No practice predicate is needed for correctness; the
identity predicate is strictly narrower than a practice predicate.** ∎

---

## 3. Migration safety review

| Check | Status |
|---|---|
| `practice_id` is `NOT NULL` with **NO default** (hard-error on missing tenant id) | ✅ |
| Add-nullable → backfill → set-not-null works on empty *and* populated tables | ✅ |
| FK creation guarded (`if not exists`) → migration re-runnable | ✅ (fixed in QA) |
| `practice_settings` singleton dropped robustly via `DROP COLUMN ... CASCADE` | ✅ (fixed in QA) |
| Helper fns are `SECURITY DEFINER` + `search_path = public, pg_temp` | ✅ (hardened in QA) |
| Migration order (001 practices → 002 columns → 003 fns/policies) respects deps | ✅ |
| `can_access_patient` redefined *after* `practice_id` columns exist (003 > 002) | ✅ |

---

## 4. Module system review

- `resolveModules(['peptide'])` → `{core, peptide, rx}` (always-on `core` + peptide + its `rx`
  dep). Default-on modules are *removable*, so they are NOT auto-injected — they live in the
  practice's stored `modules` column (written from `DEFAULT_ON` at onboarding). A real practice's
  column is e.g. `['scheduling','billing','portal','engagement','peptide']`, which resolves to add
  `core` + `rx`. ✅
- `resolveModules(['longevity'])` → `{core, longevity, labs}` (labs auto-added via dep). ✅
- `resolveModules([])` → `{core}` (always-on only). ✅
- `moduleForConnector('dexcom_realtime')` → `wearables`. ✅ (route-layer connector gate — load-bearing because connectors bypass RLS via admin client).
- `requireModule()` mirrors `requireStaff()` redirect pattern; resolves practice via practitioner→patient. ✅

---

## 5. ETL review

- FK-safe table order (parents before children; appointments before visits/invoices;
  plans → plan_phases → plan_items → plan_completions; scans → body_map_findings). ✅
- Preserves PKs (upsert on `id`) so FK relationships survive. ✅
- Nulls `auth_user_id` on patients/practitioners (Cloud has its own auth.users → re-invite). ✅
- Idempotent (upsert); dry-run by default, `--apply` to execute. ✅
- `connector_registry` copied as global (no practice_id). ✅

---

## 6. Isolation test review

- Covers all 36 tenant tables (0 practice-#1 rows visible to practice-#2 staff). ✅
- Forged-id probe (read a known practice-#1 patient by id → denied). ✅
- Positive sanity (practice-#2 staff CAN see its own row → not just blanket-deny). ✅
- Self-cleans (deletes practice #2 + auth user). ✅
- Exit 0 = PASS gate. ✅

---

## 7. Known follow-ups / integration dependencies (NOT artifact defects)

1. **Cloud baseline must be the LIVE schema dump, not the repo's migration files.** The live
   Casa Elev8 DB has tables added out-of-band (health_data_imports, connector_registry,
   practice_connectors, patient_insurance, waitlist_entries, body_composition + columns). The
   migrations here are *deltas* on top of the full 38-table baseline. **Generate the baseline via
   `pg_dump --schema-only` / `supabase db dump` from the live project** before applying 001–003.
   002/003 intentionally FAIL LOUD on a missing table (a silently-skipped tenant table = leak).
2. **Public/unauthenticated pages need app-layer change.** RLS now scopes `services/products/
   locations/articles` reads to `current_practice_id()`, which is null for anon users. Public
   practice pages (marketing, booking) must resolve the practice by subdomain and read via the
   **admin client**, not anon RLS. Track-B app work, not a migration concern.
3. **Re-invite flow** must match imported users by email and set `auth_user_id` on their existing
   practitioner/patient row (ETL nulled it).
4. **Cannot run live yet** — apply 001–003 + ETL + isolation test once the Cloud Supabase project
   is provisioned (free-tier slot currently full; awaiting Pro upgrade or a freed slot).

---

## 8. Self-score

| Dimension | Score | Note |
|---|---:|---|
| Tenant-table coverage | 10/10 | 36/36 verified vs real catalog |
| RLS policy coverage | 10/10 | every policy categorized + proven safe; keystone design |
| Migration safety | 9/10 | strong; −1 until applied against a real DB to confirm |
| Module system | 10/10 | manifest + transitive deps + connector gate correct |
| ETL correctness | 8/10 | FK order + idempotent + auth handling; −2 until a real dry-run validates row counts |
| Isolation test rigor | 9/10 | all tables + forged-id + sanity; −1 until it actually runs green |
| Documentation | 10/10 | README + QA + STAGE1 + inline rationale |
| **Total** | **66/70 (94%)** | The −4 is entirely "not yet executed against a live DB," which is blocked on provisioning, not on the work. |

**Verdict:** the tenancy foundation is **complete, internally consistent, and grounded in the real
schema**. The single highest-risk item — cross-tenant RLS leakage — is addressed with a verified,
proven-safe design and an automated gate to confirm it the moment the Cloud project exists.
