"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MarkerRow = {
  name: string;
  value: string;
  unit: string;
  ref_low: string;
  ref_high: string;
  optimal_low: string;
  optimal_high: string;
};

function emptyRow(): MarkerRow {
  return {
    name: "",
    value: "",
    unit: "",
    ref_low: "",
    ref_high: "",
    optimal_low: "",
    optimal_high: "",
  };
}

export default function PanelEntry({ patientId }: { patientId: string }) {
  const router = useRouter();

  const [panelName, setPanelName] = useState("");
  const [drawnAt, setDrawnAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [labName, setLabName] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [biologicalAge, setBiologicalAge] = useState("");
  const [chronologicalAge, setChronologicalAge] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<MarkerRow[]>([emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function setRow(i: number, patch: Partial<MarkerRow>) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }
  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }
  function removeRow(i: number) {
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i),
    );
  }

  async function save() {
    if (!panelName.trim()) {
      setErr("Panel name is required.");
      return;
    }
    if (!drawnAt) {
      setErr("Draw date is required.");
      return;
    }
    const markers = rows
      .filter((r) => r.name.trim() && r.value.trim() !== "")
      .map((r) => ({
        name: r.name.trim(),
        value: r.value,
        unit: r.unit.trim() || null,
        ref_low: r.ref_low.trim() === "" ? null : r.ref_low,
        ref_high: r.ref_high.trim() === "" ? null : r.ref_high,
        optimal_low: r.optimal_low.trim() === "" ? null : r.optimal_low,
        optimal_high: r.optimal_high.trim() === "" ? null : r.optimal_high,
      }));

    if (markers.length === 0) {
      setErr("Add at least one marker with a name and value.");
      return;
    }

    setBusy(true);
    setErr("");
    const res = await fetch("/api/biomarker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        panel_name: panelName.trim(),
        drawn_at: drawnAt || null,
        lab_name: labName.trim() || null,
        source_type: sourceType.trim() || null,
        markers,
        biological_age: biologicalAge.trim() === "" ? null : biologicalAge,
        chronological_age:
          chronologicalAge.trim() === "" ? null : chronologicalAge,
        notes: notes.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not save panel.");
      setBusy(false);
      return;
    }
    setPanelName("");
    setLabName("");
    setSourceType("");
    setBiologicalAge("");
    setChronologicalAge("");
    setNotes("");
    setRows([emptyRow()]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 760, marginTop: 8 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        Add biomarker panel
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={row2}>
          <label style={labelStyle}>
            Panel name
            <input
              value={panelName}
              onChange={(e) => setPanelName(e.target.value)}
              placeholder="Longevity Panel"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Drawn at
            <input
              type="date"
              value={drawnAt}
              onChange={(e) => setDrawnAt(e.target.value)}
              style={fieldStyle}
            />
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            Lab name
            <input
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="Quest Diagnostics"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Source type
            <input
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              placeholder="blood"
              style={fieldStyle}
            />
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            Biological age
            <input
              value={biologicalAge}
              onChange={(e) => setBiologicalAge(e.target.value)}
              inputMode="decimal"
              placeholder="38.4"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Chronological age
            <input
              value={chronologicalAge}
              onChange={(e) => setChronologicalAge(e.target.value)}
              inputMode="numeric"
              placeholder="42"
              style={fieldStyle}
            />
          </label>
        </div>
      </div>

      <h3
        className="serif"
        style={{ fontSize: 16, marginBottom: 8, marginTop: 20 }}
      >
        Markers
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 11,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span className="muted" style={{ fontSize: 12 }}>
                Marker {i + 1}
              </span>
              <button
                className="btn ghost"
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                style={{ padding: "2px 10px", fontSize: 13 }}
              >
                Remove
              </button>
            </div>
            <div style={row3}>
              <label style={labelStyle}>
                Name
                <input
                  value={r.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  placeholder="hs-CRP"
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                Value
                <input
                  value={r.value}
                  onChange={(e) => setRow(i, { value: e.target.value })}
                  inputMode="decimal"
                  placeholder="0.6"
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                Unit
                <input
                  value={r.unit}
                  onChange={(e) => setRow(i, { unit: e.target.value })}
                  placeholder="mg/L"
                  style={fieldStyle}
                />
              </label>
            </div>
            <div style={row4}>
              <label style={labelStyle}>
                Ref low
                <input
                  value={r.ref_low}
                  onChange={(e) => setRow(i, { ref_low: e.target.value })}
                  inputMode="decimal"
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                Ref high
                <input
                  value={r.ref_high}
                  onChange={(e) => setRow(i, { ref_high: e.target.value })}
                  inputMode="decimal"
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                Optimal low
                <input
                  value={r.optimal_low}
                  onChange={(e) => setRow(i, { optimal_low: e.target.value })}
                  inputMode="decimal"
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                Optimal high
                <input
                  value={r.optimal_high}
                  onChange={(e) => setRow(i, { optimal_high: e.target.value })}
                  inputMode="decimal"
                  style={fieldStyle}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          className="btn ghost"
          type="button"
          onClick={addRow}
          style={{ fontSize: 14 }}
        >
          + Add marker
        </button>
      </div>

      <label style={{ ...labelStyle, marginTop: 16 }}>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </label>

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn" type="button" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save panel"}
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
const row3 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
} as const;
const row4 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
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
