-- Migration 013: Performance indexes
-- Top-level indexes use CREATE INDEX CONCURRENTLY so they do not block
-- writes on populated production tables. CONCURRENTLY cannot run inside a
-- transaction or PL/pgSQL block; apply this file outside a transaction.
-- Future-table indexes (wearable_daily_summaries etc.) are wrapped in a
-- DO block for IF EXISTS guards — those cannot use CONCURRENTLY but the
-- tables don't exist yet so no lock contention occurs.

-- -------------------------------------------------------------------------
-- audit_logs: compliance viewer + per-actor queries
-- Actual columns: actor_practitioner_id, actor_auth_user_id, patient_id,
--                 action, resource, resource_id, created_at
-- No practice_id — single-tenant schema; actor_id maps to actor_practitioner_id
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_actor_practitioner_created
  ON audit_logs (actor_practitioner_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_patient_created
  ON audit_logs (patient_id, created_at DESC)
  WHERE patient_id IS NOT NULL;

-- -------------------------------------------------------------------------
-- appointments: calendar query (next/current appointment lookups)
-- Actual column is start_time (not starts_at); no practice_id
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS appts_patient_start_time
  ON appointments (patient_id, start_time);

CREATE INDEX CONCURRENTLY IF NOT EXISTS appts_practitioner_start_time
  ON appointments (practitioner_id, start_time)
  WHERE practitioner_id IS NOT NULL;

-- -------------------------------------------------------------------------
-- Future-table indexes — wrapped in existence checks so the migration
-- is a no-op for missing tables and self-completes when they are added.
-- -------------------------------------------------------------------------
DO $$
BEGIN
  -- wearable_daily_summaries: primary query patterns
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wearable_daily_summaries') THEN
    CREATE INDEX IF NOT EXISTS wds_patient_date
      ON wearable_daily_summaries (patient_id, date DESC);
    CREATE INDEX IF NOT EXISTS wds_practice_connector_date
      ON wearable_daily_summaries (practice_id, connector_slug, date DESC);
  END IF;

  -- notifications: unread badge poll + feed query
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    CREATE INDEX IF NOT EXISTS notif_recipient_read
      ON notifications (recipient_patient_id, read_at) WHERE read_at IS NULL;
    CREATE INDEX IF NOT EXISTS notif_practice_created
      ON notifications (practice_id, created_at DESC);
  END IF;

  -- connector_sync_jobs: worker claim query
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'connector_sync_jobs') THEN
    CREATE INDEX IF NOT EXISTS sync_jobs_worker
      ON connector_sync_jobs (status, next_attempt_at)
      WHERE status IN ('queued', 'failed');
  END IF;

  -- alerts: triage worklist
  -- idx_alerts_open (practice_id, status) already created in migration 007.
  -- This adds the patient + fired_at index for per-patient alert history queries.
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alerts') THEN
    CREATE INDEX IF NOT EXISTS alerts_patient_fired
      ON alerts (patient_id, fired_at DESC);
  END IF;

  -- ai_drafts: approvals queue
  -- idx_aidrafts_pending (practice_id, status) already created in migration 007.
  -- This adds the patient + created_at index for per-patient draft history queries.
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_drafts') THEN
    CREATE INDEX IF NOT EXISTS ai_drafts_patient_created
      ON ai_drafts (patient_id, created_at DESC);
  END IF;
END $$;
