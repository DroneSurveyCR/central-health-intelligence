"use client";

import { useState } from "react";

type Props = { patientId: string; aiEnabled: boolean };

export default function AiSynthesisButton({ patientId, aiEnabled }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [synthesis, setSynthesis] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  async function run() {
    setLoading(true);
    setErr("");
    setSynthesis("");
    setOpen(true);
    try {
      const res = await fetch("/api/ai/synthesis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setErr(json.error ?? "AI request failed."); }
      else setSynthesis(json.synthesis ?? "");
    } catch {
      setErr("Network error.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(synthesis).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!aiEnabled) {
    return (
      <button className="btn ghost" disabled title="Add ANTHROPIC_API_KEY to enable AI features">
        Draft with AI
      </button>
    );
  }

  return (
    <>
      <button className="btn ghost" onClick={run}>Draft with AI</button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            style={{
              background: "var(--bg)", borderRadius: 16, padding: 28, maxWidth: 660,
              width: "100%", maxHeight: "85vh", overflowY: "auto",
              boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 20 }}>AI Session Briefing</h2>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--muted)" }}
              >×</button>
            </div>

            {loading && (
              <p className="muted" style={{ fontSize: 14 }}>Generating briefing…</p>
            )}

            {err && (
              <p style={{ color: "var(--berry)", fontSize: 14 }}>{err}</p>
            )}

            {synthesis && (
              <>
                <div
                  style={{
                    fontSize: 14.5, lineHeight: 1.7, whiteSpace: "pre-wrap",
                    padding: "16px 0", borderBottom: "1px solid var(--line)",
                  }}
                >
                  {synthesis}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="btn ghost" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
                  <button className="btn ghost" onClick={run}>Regenerate</button>
                  <button className="btn ghost" onClick={() => setOpen(false)}>Close</button>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
                  AI-generated briefing. Review before using clinically. Not a diagnosis.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
