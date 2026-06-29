import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { createGithubIssue } from "@/lib/github/issues";
import { NextResponse } from "next/server";

const CATEGORIES = ["problem", "help", "customization", "other"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

/** POST /api/tickets — a clinic opens a support ticket (problem / help / customization). */
export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;

  const body = (await request.json().catch(() => ({}))) as {
    subject?: string;
    body?: string;
    category?: string;
    priority?: string;
  };
  const subject = String(body.subject ?? "").trim().slice(0, 200);
  const detail = String(body.body ?? "").trim().slice(0, 8000);
  const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : "problem";
  const priority = PRIORITIES.includes(String(body.priority)) ? String(body.priority) : "normal";

  if (!subject) return NextResponse.json({ error: "subject is required" }, { status: 400 });

  const supabase = await createClient();
  // RLS + the practice_id default scope this to the caller's practice.
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ subject, body: detail || null, category, priority, created_by: me.id })
    .select("id")
    .maybeSingle();
  if (error || !ticket) return NextResponse.json({ error: error?.message ?? "could not create ticket" }, { status: 400 });

  // First thread message = the ticket body.
  if (detail) {
    await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      author_kind: "clinic",
      author_practitioner_id: me.id,
      body: detail,
    });
  }

  // Mirror to a GitHub issue so the platform team can track + fix it. Best-effort.
  const issue = await createGithubIssue({
    title: `[${category}] ${subject}`,
    body: `**Practice:** ${me.practice_id}\n**Opened by:** ${me.name} (${me.role})\n**Priority:** ${priority}\n\n${detail || "_no description_"}`,
    labels: ["support", category, `priority:${priority}`],
  });
  if (issue) {
    await supabase
      .from("support_tickets")
      .update({ github_issue_number: issue.number, github_issue_url: issue.url })
      .eq("id", ticket.id);
  }

  await logAudit({ action: "create", resource: "support_tickets", resourceId: ticket.id });

  return NextResponse.json({ ok: true, id: ticket.id, githubIssue: issue?.url ?? null });
}
