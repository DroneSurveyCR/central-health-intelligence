import { getCurrentPractitioner, getSessionUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnector } from "@/lib/connectors/registry";
import { moduleForConnector } from "@/lib/modules";
import { getEnabledModules } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const { user } = await getSessionUser();
  const me = await getCurrentPractitioner();
  if (!me || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { importId } = await params;
  const body = await request.json().catch(() => ({})) as { edits?: Record<string, unknown>[]; reviewerNotes?: string };
  const admin = createAdminClient();

  // Atomically transition from pending_review → parsing (reused as "locked").
  // Only one concurrent request can win this update; the loser gets 0 rows back.
  // Admin client bypasses RLS — scope to the caller's practice or a foreign importId writes cross-tenant PHI.
  const { data: claimed } = await admin
    .from("health_data_imports")
    .update({ status: "parsing", parse_error: null })
    .eq("id", importId)
    .eq("practice_id", me.practice_id)
    .eq("status", "pending_review")
    .select("patient_id, connector_id, parsed_data");

  if (!claimed?.length) {
    const { data: job } = await admin.from("health_data_imports").select("status").eq("id", importId).eq("practice_id", me.practice_id).maybeSingle();
    if (!job) return NextResponse.json({ error: "Import not found" }, { status: 404 });
    return NextResponse.json({ error: `Cannot confirm: status is "${job.status}"` }, { status: 409 });
  }

  const job = claimed[0];

  // Module gate: confirm uses the admin client (bypasses RLS), so enforce module ownership here.
  // Release the claim back to pending_review on failure so the row isn't left locked.
  const owner = moduleForConnector(job.connector_id);
  if (owner && !(await getEnabledModules()).has(owner)) {
    await admin.from("health_data_imports").update({ status: "pending_review" }).eq("id", importId);
    return NextResponse.json({ error: "Module not enabled for this connector" }, { status: 403 });
  }

  const parsedData = job.parsed_data as { rows?: Record<string, unknown>[]; summary?: string } | null;
  let rows: Record<string, unknown>[] = parsedData?.rows ?? [];
  if (body.edits?.length) rows = body.edits;

  try {
    const connector = getConnector(job.connector_id);
    const targetRowIds = await connector.confirm(rows, importId, job.patient_id, admin, me.practice_id);

    const { error: updateErr } = await admin.from("health_data_imports").update({
      status: "confirmed",
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
      target_row_ids: targetRowIds,
      reviewer_notes: body.reviewerNotes ?? null,
    }).eq("id", importId);

    // Data is already written — don't mark as failed if only the status update failed.
    if (updateErr) return NextResponse.json({ error: `Data saved but status update failed: ${updateErr.message}` }, { status: 500 });

    await logAudit({ action: "create", resource: "health_data_imports", resourceId: importId, patientId: job.patient_id });
    return NextResponse.json({ importId, status: "confirmed", targetRowIds });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("health_data_imports").update({ status: "failed", parse_error: msg }).eq("id", importId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
