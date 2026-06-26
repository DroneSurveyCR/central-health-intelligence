"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffComposer({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, body: text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "Could not send — please try again.");
        setBusy(false);
        return;
      }
      setBody("");
      setBusy(false);
      router.refresh();
    } catch {
      setErr("Could not send — please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setErr("");
        }}
        placeholder="Write a reply…"
        rows={3}
        maxLength={4000}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--line)",
          fontFamily: "inherit",
          fontSize: 15,
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      {err && (
        <p style={{ margin: "8px 0 0", color: "#b4231f", fontSize: 13 }}>{err}</p>
      )}
      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn"
          onClick={send}
          disabled={busy || !body.trim()}
          style={{ opacity: busy || !body.trim() ? 0.6 : 1 }}
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
