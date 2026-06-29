import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { setGithubIssueState } from "@/lib/github/issues";
import { NextResponse } from "next/server";

const STATUSES = ["open", "in_progress", "resolved", "closed"];

/** PATCH /api/tickets/[id] — change ticket status. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  const status = String(body.status ?? "");
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });

  const supabase = await createClient();
  // RLS scopes the update to the caller's practice.
  const { data: updated, error } = await supabase
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, github_issue_number")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!updated) return NextResponse.json({ error: "ticket not found" }, { status: 404 });

  if (updated.github_issue_number)
    await setGithubIssueState(updated.github_issue_number, status === "closed" || status === "resolved" ? "closed" : "open");

  await logAudit({ action: "update", resource: "support_tickets", resourceId: id });
  return NextResponse.json({ ok: true });
}
