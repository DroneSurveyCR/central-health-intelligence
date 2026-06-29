import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import TicketActions from "./TicketActions";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, subject, body, category, status, priority, github_issue_url, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) {
    return (
      <div style={{ maxWidth: 760 }}>
        <p className="muted">Ticket not found, or you don&apos;t have access.</p>
        <Link href="/support">← Back to Support</Link>
      </div>
    );
  }

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, author_kind, body, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return (
    <div style={{ maxWidth: 760 }}>
      <Link href="/support" className="muted" style={{ fontSize: 13 }}>← Support</Link>
      <h1 className="serif" style={{ fontSize: 26, margin: "6px 0 2px" }}>{ticket.subject}</h1>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        {ticket.category} · {ticket.priority} priority · status: <strong>{ticket.status}</strong>
        {ticket.github_issue_url ? (
          <> · <a href={ticket.github_issue_url} target="_blank" rel="noreferrer">tracked on GitHub ↗</a></>
        ) : null}
      </p>

      <section className="card" style={{ marginTop: 16, padding: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(messages ?? []).length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>{ticket.body || "No messages yet."}</p>
          ) : (
            (messages ?? []).map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.author_kind === "support" ? "flex-start" : "flex-end",
                  maxWidth: "85%",
                  background: m.author_kind === "support" ? "var(--paper-2, #f3f1ec)" : "var(--berry, #14834e)",
                  color: m.author_kind === "support" ? "inherit" : "#fff",
                  padding: "9px 12px",
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>
                  {m.author_kind === "support" ? "Support" : "Your clinic"}
                </div>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{m.body}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <TicketActions ticketId={ticket.id} status={ticket.status} />
    </div>
  );
}
