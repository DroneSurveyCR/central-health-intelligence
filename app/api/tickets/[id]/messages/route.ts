import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { commentGithubIssue } from "@/lib/github/issues";
import { NextResponse } from "next/server";

/** POST /api/tickets/[id]/messages — add a reply to a ticket thread. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { body?: string };
  const text = String(body.body ?? "").trim().slice(0, 8000);
  if (!text) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const supabase = await createClient();
  // RLS scopes this to the caller's practice; a foreign ticket id resolves to null.
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, github_issue_number")
    .eq("id", id)
    .maybeSingle();
  if (!ticket) return NextResponse.json({ error: "ticket not found" }, { status: 404 });

  const { error } = await supabase.from("ticket_messages").insert({
    ticket_id: id,
    author_kind: "clinic",
    author_practitioner_id: me.id,
    body: text,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Re-open a resolved/closed ticket on a new clinic reply, and bump updated_at.
  await supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", id);

  if (ticket.github_issue_number) await commentGithubIssue(ticket.github_issue_number, `**${me.name} (clinic):** ${text}`);

  await logAudit({ action: "create", resource: "ticket_messages", resourceId: id });
  return NextResponse.json({ ok: true });
}
