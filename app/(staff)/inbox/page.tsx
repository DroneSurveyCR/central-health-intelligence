import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import EmptyState from "@/lib/ui/EmptyState";

type Row = {
  id: string;
  patient_id: string;
  sender: string;
  body: string;
  read_at: string | null;
  created_at: string;
  patients: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export default async function StaffInbox() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, patient_id, sender, body, read_at, created_at, patients(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(400);
  await logAudit({ action: "view", resource: "messages_inbox" });

  const list = (data ?? []) as Row[];
  const byPatient = new Map<string, { patient_id: string; name: string; latest: Row; unread: number }>();
  for (const m of list) {
    const p = Array.isArray(m.patients) ? m.patients[0] : m.patients;
    if (!byPatient.has(m.patient_id)) {
      byPatient.set(m.patient_id, {
        patient_id: m.patient_id,
        name: p ? `${p.first_name} ${p.last_name}`.trim() : "Patient",
        latest: m,
        unread: 0,
      });
    }
    if (m.sender === "patient" && !m.read_at) byPatient.get(m.patient_id)!.unread++;
  }
  const threads = Array.from(byPatient.values());
  const totalUnread = threads.reduce((n, t) => n + t.unread, 0);

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 26, margin: 0 }}>Messages</h1>
      <p className="muted" style={{ marginTop: 4 }}>
        Patient conversations{totalUnread > 0 ? ` · ${totalUnread} unread` : ""}.
      </p>
      <div style={{ marginTop: 16, display: "grid", gap: 10, maxWidth: 720 }}>
        {threads.length === 0 && (
          <EmptyState title="No messages yet" message="When a patient sends a message, their conversation appears here." />
        )}
        {threads.map((t) => (
          <Link
            key={t.patient_id}
            href={`/messages/${t.patient_id}`}
            className="card"
            style={{ maxWidth: "none", textDecoration: "none", color: "var(--ink)", display: "block", borderLeft: t.unread > 0 ? "3px solid var(--berry)" : undefined }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <b style={{ fontSize: 15 }}>{t.name}</b>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {t.unread > 0 && (
                  <span className="badge" style={{ background: "var(--berry)", color: "#fff" }}>{t.unread} new</span>
                )}
                <span className="muted" style={{ fontSize: 12 }}>{relTime(t.latest.created_at)}</span>
              </span>
            </div>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {t.latest.sender === "staff" ? "You: " : ""}{t.latest.body}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
