"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VERDICTS = ["improved", "no_change", "worsened", "inconclusive"];

export default function OutcomeLogger({
  patientId,
  recommendationId,
  markers,
}: {
  patientId: string;
  recommendationId: string;
  markers: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [marker, setMarker] = useState(markers[0] ?? "");
  const [baseline, setBaseline] = useState("");
  const [during, setDuring] = useState("");
  const [after, setAfter] = useState("");
  const [verdict, setVerdict] = useState("inconclusive");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!marker.trim()) {
      setErr("Name the marker.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await fetch("/api/modalities/outcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        recommendation_id: recommendationId,
        marker: marker.trim(),
        baseline: baseline.trim() === "" ? null : Number(baseline),
        during: during.trim() === "" ? null : Number(during),
        after: after.trim() === "" ? null : Number(after),
        verdict,
        notes: notes.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not record outcome.");
      setBusy(false);
      return;
    }
    setBaseline("");
    setDuring("");
    setAfter("");
    setVerdict("inconclusive");
    setNotes("");
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        className="btn ghost"
        type="button"
        onClick={() => setOpen(true)}
        style={{ padding: "4px 12px", fontSize: 14, marginTop: 8 }}
      >
        Record a reading
      </button>
    );
  }

  return (
    <div
      className="card"
      style={{ marginTop: 10, background: "var(--bg-soft, #faf7fa)" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={labelStyle}>
          Marker
          {markers.length > 0 ? (
            <select
              value={marker}
              onChange={(e) => setMarker(e.target.value)}
              style={fieldStyle}
            >
              {markers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="__other">other…</option>
            </select>
          ) : (
            <input
              value={marker}
              onChange={(e) => setMarker(e.target.value)}
              placeholder="HRV"
              style={fieldStyle}
            />
          )}
        </label>

        {marker === "__other" && (
          <label style={labelStyle}>
            Custom marker
            <input
              value={marker === "__other" ? "" : marker}
              onChange={(e) => setMarker(e.target.value)}
              placeholder="Marker name"
              style={fieldStyle}
            />
          </label>
        )}

        <div style={row3}>
          <label style={labelStyle}>
            Baseline
            <input
              value={baseline}
              onChange={(e) => setBaseline(e.target.value)}
              inputMode="decimal"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            During
            <input
              value={during}
              onChange={(e) => setDuring(e.target.value)}
              inputMode="decimal"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            After
            <input
              value={after}
              onChange={(e) => setAfter(e.target.value)}
              inputMode="decimal"
              style={fieldStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Personal response (clinician interpretation)
          <select
            value={verdict}
            onChange={(e) => setVerdict(e.target.value)}
            style={fieldStyle}
          >
            {VERDICTS.map((v) => (
              <option key={v} value={v}>
                {v.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={fieldStyle}
          />
        </label>
      </div>

      {err && (
        <p className="msg err" style={{ marginTop: 8 }}>
          {err}
        </p>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          className="btn"
          type="button"
          disabled={busy}
          onClick={save}
          style={{ padding: "4px 14px", fontSize: 14 }}
        >
          {busy ? "Saving…" : "Save reading"}
        </button>
        <button
          className="btn ghost"
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          style={{ padding: "4px 14px", fontSize: 14 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const row3 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 10,
} as const;
const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
} as const;
const fieldStyle = {
  padding: "10px 12px",
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  fontSize: 15,
  background: "#fff",
  fontFamily: "inherit",
} as const;
