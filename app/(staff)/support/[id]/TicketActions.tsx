"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TicketActions({ ticketId, status }: { ticketId: string; status: string }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      if (res.ok) {
        setReply("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(next: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const field: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line, #ddd)", fontSize: 14, minHeight: 70, resize: "vertical" };

  return (
    <section className="card" style={{ marginTop: 14, padding: 18 }}>
      <form onSubmit={send} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea style={field} placeholder="Reply…" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={8000} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" type="submit" disabled={busy || !reply.trim()}>Send reply</button>
          <span style={{ flex: 1 }} />
          {status !== "closed" && status !== "resolved" ? (
            <button className="btn ghost" type="button" onClick={() => setStatus("resolved")} disabled={busy}>Mark resolved</button>
          ) : (
            <button className="btn ghost" type="button" onClick={() => setStatus("open")} disabled={busy}>Re-open</button>
          )}
        </div>
      </form>
    </section>
  );
}
