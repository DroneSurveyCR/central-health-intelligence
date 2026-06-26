"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SupplementQuickLog() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [timing, setTiming] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!name.trim()) {
      setErr("Supplement name is required.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await fetch("/api/nutrition/supplement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplement_name: name.trim(),
        dose: dose.trim() || null,
        timing: timing.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not log supplement.");
      setBusy(false);
      return;
    }
    setName("");
    setDose("");
    setTiming("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        Log a supplement
      </h2>
      <div style={row3}>
        <label style={labelStyle}>
          Supplement
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Magnesium glycinate"
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          Dose
          <input
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="400 mg"
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          Timing
          <input
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
            placeholder="bedtime"
            style={fieldStyle}
          />
        </label>
      </div>

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn" type="button" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Log supplement"}
        </button>
      </div>
    </div>
  );
}

const row3 = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr",
  gap: 12,
} as const;
const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
} as const;
const fieldStyle = {
  padding: "12px 13px",
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  fontSize: 15,
  background: "#fff",
} as const;
