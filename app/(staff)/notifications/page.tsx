import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { markRead, markAllRead } from "./actions";

// Notifications feed. requireStaff + RLS session client => tenant-scoped: a user
// only ever sees their own practice's notifications.

type Severity = "info" | "warn" | "urgent";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  severity: Severity;
  interrupt: boolean;
  read_at: string | null;
  created_at: string;
};

const SEVERITY_COLOR: Record<Severity, string> = {
  urgent: "#b91c1c",
  warn: "#b45309",
  info: "#475569",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default async function NotificationsPage() {
  await requireStaff();
  const supabase = await createClient();

  // Unread first, then newest first. RLS scopes to the practice automatically.
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, severity, interrupt, read_at, created_at")
    .order("read_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(200);

  const notifications = (data ?? []) as NotificationRow[];
  const unread = notifications.filter((n) => n.read_at == null).length;

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          Notifications
        </h1>
        {unread > 0 && (
          <span className="badge unread">{unread} unread</span>
        )}
        <div style={{ marginLeft: "auto" }}>
          {unread > 0 && (
            <form action={markAllRead}>
              <button className="btn ghost" type="submit" style={{ padding: "4px 12px", fontSize: 14 }}>
                Mark all read
              </button>
            </form>
          )}
        </div>
      </div>
      <p className="muted">Alerts and nudges delivered to your practice, unread first.</p>

      <section className="card" style={{ marginTop: 18 }}>
        {notifications.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No notifications yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notifications.map((n) => {
              const isUnread = n.read_at == null;
              return (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                    borderLeft: `4px solid ${SEVERITY_COLOR[n.severity]}`,
                    padding: "10px 12px",
                    background: isUnread ? "var(--surface, #fafafa)" : "transparent",
                    opacity: isUnread ? 1 : 0.65,
                    borderRadius: 6,
                  }}
                >
                  <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600 }}>{n.title}</span>
                      <span
                        className="badge"
                        style={{
                          background: SEVERITY_COLOR[n.severity],
                          color: "#fff",
                          textTransform: "uppercase",
                          fontSize: 10,
                        }}
                      >
                        {n.severity}
                      </span>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {n.body && (
                      <div style={{ fontSize: 14, marginTop: 2 }}>{n.body}</div>
                    )}
                    {n.link && (
                      <Link href={n.link} style={{ fontSize: 13 }}>
                        View
                      </Link>
                    )}
                  </div>
                  {isUnread && (
                    <form action={markRead}>
                      <input type="hidden" name="id" value={n.id} />
                      <button className="btn ghost" type="submit" style={{ padding: "4px 12px", fontSize: 14 }}>
                        Mark read
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
