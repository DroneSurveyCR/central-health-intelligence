"use client";

import { useState } from "react";

/** Doctor/admin sets the patient assistant's daily question cap for their own practice. */
export default function AssistantLimitForm({ current }: { current: number }) {
  const [value, setValue] = useState<number>(current);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setErr("");
    setSaved(false);
    try {
      const res = await fetch("/api/settings/assistant-limit", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dailyLimit: value }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok || json.error) setErr(json.error ?? "Update failed.");
      else setSaved(true);
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      {err && <p style={{ color: "var(--rust, #c0392b)", fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
      <label style={{ display: "block", fontSize: 13 }}>
        <span className="muted" style={{ display: "block", marginBottom: 6 }}>Questions per day, per patient</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="number"
            min={1}
            max={500}
            value={value}
            onChange={(e) => {
              setValue(Number(e.target.value) || 1);
              setSaved(false);
            }}
            disabled={busy}
            style={{ width: 90, borderRadius: 8, border: "1px solid var(--line)", padding: "7px 9px", fontSize: 14 }}
          />
          <button type="button" className="btn ghost" disabled={busy} onClick={save} style={{ padding: "6px 14px" }}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </label>
      {saved && <p className="muted" style={{ fontSize: 12.5, margin: "10px 0 0" }}>Saved.</p>}
    </div>
  );
}
