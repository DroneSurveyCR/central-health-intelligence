import { createClient } from "@/lib/supabase/server";

type AuditAction = "view" | "create" | "update" | "delete" | "export" | "ai_synthesis";

/**
 * Records a PHI access in audit_logs. DB triggers cover writes; this covers
 * READS (SELECT has no trigger). RULE (see AGENTS.md): every server path that
 * loads a patient record must call logAudit({ action: "view", ... }).
 */
export async function logAudit(params: {
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  patientId?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // no auditing without an authenticated actor

  // Multi-tenant: audit_logs.practice_id is NOT NULL and the RLS insert policy
  // requires it to equal the caller's practice. Resolve it (staff first, then patient).
  const { data: prac } = await supabase
    .from("practitioners")
    .select("practice_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  let practiceId = (prac?.practice_id as string | undefined) ?? null;
  if (!practiceId) {
    const { data: pt } = await supabase
      .from("patients")
      .select("practice_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    practiceId = (pt?.practice_id as string | undefined) ?? null;
  }
  if (!practiceId) return; // authed user not linked to a practice — skip rather than throw

  await supabase.from("audit_logs").insert({
    practice_id: practiceId,
    actor_auth_user_id: user.id,
    patient_id: params.patientId ?? null,
    action: params.action,
    resource: params.resource,
    resource_id: params.resourceId ?? null,
  });
}
