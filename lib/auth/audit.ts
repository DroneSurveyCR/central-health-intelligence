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
  await supabase.from("audit_logs").insert({
    actor_auth_user_id: user?.id ?? null,
    patient_id: params.patientId ?? null,
    action: params.action,
    resource: params.resource,
    resource_id: params.resourceId ?? null,
  });
}
