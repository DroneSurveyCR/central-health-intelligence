"use client";

import { useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Connector = { id: string; label: string; description: string | null; accepts: string[]; target_table: string; phase: string; requires_api_key: boolean; enabled: boolean };

const TARGET_LABEL: Record<string, string> = {
  scans: "Scans", lab_results: "Labs", body_composition: "Body comp",
  files: "Files", patients: "Clients", visits: "Visits",
};

export default function ConnectorGrid({ connectors }: { connectors: Connector[] }) {
  const [states, setStates] = useState<Record<string, boolean>>(
    Object.fromEntries(connectors.map((c) => [c.id, c.enabled])),
  );
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: string, newVal: boolean) {
    setBusy(id);
    try {
      await fetch(`/api/settings/connectors/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: newVal }),
      });
      setStates((s) => ({ ...s, [id]: newVal }));
    } finally { setBusy(null); }
  }

  const mvp = connectors.filter((c) => c.phase === "mvp");
  const phase2 = connectors.filter((c) => c.phase === "phase2");

  function renderGrid(list: Connector[]) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 32 }}>
        {list.map((c) => (
          <div key={c.id} className="card" style={{ padding: "16px 18px", opacity: c.phase === "phase2" ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</div>
                {c.description && <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{c.description}</div>}
                <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                  → {TARGET_LABEL[c.target_table] ?? c.target_table} · {c.accepts.map((a) => a.split("/")[1]).join(", ")}
                </div>
              </div>
              {c.phase === "phase2" ? (
                <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--paper)", borderRadius: 8, color: "var(--muted)", flexShrink: 0 }}>Coming soon</span>
              ) : (
                <button
                  onClick={() => toggle(c.id, !states[c.id])}
                  disabled={busy === c.id}
                  style={{
                    flexShrink: 0,
                    width: 42, height: 24, borderRadius: 12,
                    background: states[c.id] ? "var(--berry)" : "var(--line)",
                    border: "none", cursor: "pointer", transition: "background 0.2s",
                    position: "relative",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 3, left: states[c.id] ? 20 : 3,
                    width: 18, height: 18, background: "#fff", borderRadius: 9, transition: "left 0.2s",
                  }} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="serif" style={{ fontSize: 18, marginBottom: 12 }}>Available now</h2>
      {renderGrid(mvp)}
      <h2 className="serif" style={{ fontSize: 18, marginBottom: 12, marginTop: 8 }}>Coming soon (Phase 2)</h2>
      {renderGrid(phase2)}
    </div>
  );
}
