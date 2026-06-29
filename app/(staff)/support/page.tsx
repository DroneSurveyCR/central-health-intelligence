import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import NewTicketForm from "./NewTicketForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default async function SupportPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, category, status, priority, github_issue_url, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  const rows = tickets ?? [];

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>Support</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Report a problem, ask for help, or request a customization. We track every ticket and
        push fixes back to your clinic.
      </p>

      <section className="card" style={{ marginTop: 18, padding: 22 }}>
        <h2 className="serif" style={{ fontSize: 18, marginTop: 0 }}>New ticket</h2>
        <NewTicketForm />
      </section>

      <section className="card" style={{ marginTop: 16, padding: 22 }}>
        <h2 className="serif" style={{ fontSize: 18, marginTop: 0 }}>Your tickets</h2>
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No tickets yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((t) => (
              <Link
                key={t.id}
                href={`/support/${t.id}`}
                className="card"
                style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
              >
                <span
                  className="badge"
                  style={{
                    textTransform: "capitalize",
                    background: t.status === "open" ? "var(--berry, #14834e)" : t.status === "closed" || t.status === "resolved" ? "#9aa" : "var(--gold, #f4a63c)",
                    color: "#fff",
                  }}
                >
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
                <span style={{ flex: 1 }}>
                  <strong>{t.subject}</strong>
                  <span className="muted" style={{ display: "block", fontSize: 12.5 }}>
                    {t.category} · {t.priority} priority
                  </span>
                </span>
                {t.github_issue_url ? (
                  <span className="muted" style={{ fontSize: 12 }}>tracked ↗</span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
