-- 019_spine_scans.sql — generalized spine-scan attachments on spine_assessments.
-- One flexible import path for any device scan (thermal / X-ray-DICOM / sEMG / posture /
-- CoreScore). Additive jsonb column; RLS already enforced on the table (018). Each entry:
-- { type, ref (storage path), name, uploaded_at }.

alter table public.spine_assessments add column if not exists scan_files jsonb not null default '[]';
