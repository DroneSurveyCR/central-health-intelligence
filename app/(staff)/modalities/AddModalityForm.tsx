"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "energy",
  "infusion",
  "peptide",
  "regenerative",
  "thermal",
  "detox",
  "bodywork",
  "plant-medicine",
  "nutraceutical",
  "other",
];
const EVIDENCE = ["emerging", "observational", "established"];

/** Split a comma/newline list into a clean string[]. */
function toList(s: string): string[] {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export default function AddModalityForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("energy");
  const [evidence, setEvidence] = useState("emerging");
  const [indications, setIndications] = useState("");
  const [markers, setMarkers] = useState("");
  const [contraindications, setContraindications] = useState("");
  const [cost, setCost] = useState("");
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!name.trim()) {
      setErr("Give the modality a name.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await fetch("/api/modalities/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        category,
        evidence_level: evidence,
        indications: toList(indications),
        target_markers: toList(markers),
        contraindications: toList(contraindications),
        typical_cost: cost.trim() === "" ? null : Number(cost),
        typical_duration: duration.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not add modality.");
      setBusy(false);
      return;
    }
    setName("");
    setIndications("");
    setMarkers("");
    setContraindications("");
    setCost("");
    setDuration("");
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn" type="button" onClick={() => setOpen(true)}>
        Add a clinic modality
      </button>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        New clinic modality
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={row2}>
          <label style={labelStyle}>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hyperbaric oxygen"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={fieldStyle}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            Evidence level
            <select
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              style={fieldStyle}
            >
              {EVIDENCE.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Typical cost (USD)
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              inputMode="decimal"
              placeholder="150"
              style={fieldStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Typical duration
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="60 min/session"
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Indications (comma or newline separated)
          <textarea
            value={indications}
            onChange={(e) => setIndications(e.target.value)}
            placeholder="recovery, fatigue"
            rows={2}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Target markers
          <textarea
            value={markers}
            onChange={(e) => setMarkers(e.target.value)}
            placeholder="HRV, CRP, sleep quality"
            rows={2}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Contraindications
          <textarea
            value={contraindications}
            onChange={(e) => setContraindications(e.target.value)}
            placeholder="pregnancy, active infection"
            rows={2}
            style={fieldStyle}
          />
        </label>
      </div>

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button className="btn" type="button" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Add modality"}
        </button>
        <button
          className="btn ghost"
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const row2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
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
  fontFamily: "inherit",
} as const;
