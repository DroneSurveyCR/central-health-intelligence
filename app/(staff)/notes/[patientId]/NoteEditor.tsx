"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES: { value: string; label: string }[] = [
  { value: "consult", label: "Consult" },
  { value: "follow_up", label: "Follow-up" },
  { value: "scan_review", label: "Scan review" },
  { value: "other", label: "Other" },
];

export default function NoteEditor({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [type, setType] = useState("consult");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!note.trim()) {
      setErr("Write a note before saving.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await fetch("/api/visit-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, note: note.trim(), type }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not save — please try again.");
      setBusy(false);
      return;
    }
    setNote("");
    setType("consult");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 640, marginTop: 8 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        New note
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={labelStyle}>
          Visit type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={fieldStyle}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened in this visit…"
            rows={6}
            style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </label>
      </div>

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          className="btn"
          type="button"
          disabled={busy}
          onClick={save}
        >
          {busy ? "Saving…" : "Save note"}
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button
            className="btn ghost"
            type="button"
            disabled
            title="AI transcription coming soon"
            style={{ cursor: "not-allowed", opacity: 0.6 }}
          >
            🎤 Record voice note (coming soon)
          </button>
          <span className="muted" style={{ fontSize: 12 }}>
            AI transcription coming soon
          </span>
        </div>
      </div>
    </div>
  );
}

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
