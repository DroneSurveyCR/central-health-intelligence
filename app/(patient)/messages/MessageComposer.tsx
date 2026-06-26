"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/LanguageContext";

export default function MessageComposer() {
  const router = useRouter();
  const t = useT();
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
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || t("messages_send_error"));
        setBusy(false);
        return;
      }
      setBody("");
      setBusy(false);
      router.refresh();
    } catch {
      setErr(t("messages_send_error"));
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
        placeholder={t("messages_placeholder")}
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
          {busy ? t("messages_sending") : t("messages_send")}
        </button>
      </div>
    </div>
  );
}
