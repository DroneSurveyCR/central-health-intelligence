"use client";

import { useState } from "react";

/**
 * Inline label editor for a patient record. Renders existing labels as removable
 * chips plus an add input. Optimistic; reconciles on error.
 */
export default function LabelEditor({
  patientId,
  initial,
}: {
  patientId: string;
  initial: string[];
}) {
  const [labels, setLabels] = useState<string[]>(initial);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add() {
    const label = value.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!label || labels.includes(label)) { setValue(""); return; }
    setBusy(true); setErr("");
    const prev = labels;
    setLabels([...labels, label]); setValue("");
    try {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId, label }),
      });
      if (!res.ok) { setLabels(prev); setErr("Could not add label."); }
    } catch { setLabels(prev); setErr("Network error."); }
    finally { setBusy(false); }
  }

  async function remove(label: string) {
    setBusy(true); setErr("");
    const prev = labels;
    setLabels(labels.filter((l) => l !== label));
    try {
      const res = await fetch(
        `/api/labels?patientId=${encodeURIComponent(patientId)}&label=${encodeURIComponent(label)}`,
        { method: "DELETE" },
      );
      if (!res.ok) { setLabels(prev); setErr("Could not remove label."); }
    } catch { setLabels(prev); setErr("Network error."); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      {labels.map((l) => (
        <span
          key={l}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "3px 8px", borderRadius: 999, fontSize: 12,
            background: "var(--wash, #f3eef2)", border: "1px solid var(--line)",
          }}
        >
          {l}
          <button
            type="button"
            aria-label={`Remove label ${l}`}
            onClick={() => remove(l)}
            disabled={busy}
            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        placeholder="Add label…"
        aria-label="Add a label"
        disabled={busy}
        style={{
          padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 999,
          fontSize: 12, minWidth: 110,
        }}
      />
      {err && <span style={{ color: "var(--berry)", fontSize: 12 }}>{err}</span>}
    </div>
  );
}
