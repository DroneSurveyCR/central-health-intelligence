"use client";

import { useState } from "react";

const EXAMPLES = [
  "What are the normal cervical lordosis values?",
  "How is scoliosis graded by Cobb angle?",
  "What does a C6 subluxation refer to?",
  "Explain the 3-phase treatment model.",
];

type Turn = { q: string; a: string; inScope: boolean };

export default function ChiroAssistant() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/chiro/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const json = (await res.json().catch(() => ({}))) as { answer?: string; inScope?: boolean; error?: string };
      if (!res.ok || json.error) setErr(json.error ?? "Request failed.");
      else {
        setTurns((prev) => [{ q: text, a: json.answer ?? "", inScope: json.inScope !== false }, ...prev]);
        setQ("");
      }
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(q); }}
          placeholder="Ask a chiropractic / spine question…"
          disabled={busy}
          style={{ flex: "1 1 320px", borderRadius: 10, border: "1px solid var(--line)", padding: "10px 12px", fontSize: 15 }}
        />
        <button type="button" className="btn" disabled={busy || !q.trim()} onClick={() => ask(q)} style={{ padding: "10px 18px" }}>
          {busy ? "Asking…" : "Ask"}
        </button>
      </div>

      {turns.length === 0 && (
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => ask(ex)} disabled={busy}
              className="btn ghost" style={{ fontSize: 12.5, padding: "6px 11px" }}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {err && <p style={{ color: "var(--rust, #c0392b)", fontSize: 13, marginTop: 10 }}>{err}</p>}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {turns.map((t, i) => (
          <div key={i} className="card">
            <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{t.q}</p>
            <p style={{ margin: 0, fontSize: 14.5, color: t.inScope ? "inherit" : "var(--muted)", whiteSpace: "pre-wrap" }}>
              {t.a}
            </p>
            {!t.inScope && (
              <p className="muted" style={{ margin: "6px 0 0", fontSize: 12 }}>Out of scope — declined by the guardrail.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
