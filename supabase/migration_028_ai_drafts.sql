-- 028 — AI Draft Queue & Approval: the "AI drafts → doctor approves" plumbing.
-- ai_drafts holds AI-generated content awaiting human review. Approval is the
-- ONLY thing that finalizes a draft; writing approved content to target tables
-- is left to callers. STAFF-ONLY (has patient_id but no patient self-read policy).

create table if not exists ai_drafts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  kind text not null check (kind in (
    'visit_note','scan_synthesis','protocol_change','titration',
    'wearable_narrative','message_reply','superbill','briefing_points'
  )),
  status text not null default 'pending' check (status in (
    'pending','approved','rejected','edited'
  )),
  source_ref jsonb,
  model text,
  draft_content text,
  edited_content text,
  reviewed_by uuid references practitioners(id),
  reviewed_at timestamptz,
  approved_content text,
  target_table text,
  target_id uuid,
  created_at timestamptz not null default now()
);

alter table ai_drafts enable row level security;
create policy "ai_drafts_staff" on ai_drafts for all using (can_access_patient(patient_id)) with check (can_access_patient(patient_id));

grant select, insert, update, delete on ai_drafts to authenticated;
grant all on ai_drafts to service_role;

create index if not exists idx_ai_drafts_status_created on ai_drafts(status, created_at desc);
