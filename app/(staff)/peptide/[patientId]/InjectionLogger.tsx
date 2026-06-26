"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SITES = [
  "abdomen_l",
  "abdomen_r",
  "thigh_l",
  "thigh_r",
  "arm_l",
  "arm_r",
];

export default function InjectionLogger({
  protocolId,
  patientId,
}: {
  protocolId: string;
  patientId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [doseMg, setDoseMg] = useState("");
  const [site, setSite] = useState("abdomen_l");
  const [weightKg, setWeightKg] = useState("");
  const [sideEffects, setSideEffects] = useState("");
  const [severity, setSeverity] = useState("");
  const [administeredBy, setAdministeredBy] = useState("clinic");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (doseMg.trim() === "" || Number.isNaN(Number(doseMg))) {
      setErr("Enter a valid dose (mg).");
      return;
    }
    setBusy(true);
    setErr("");
    const effects = sideEffects
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const res = await fetch("/api/peptide/administration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        protocol_id: protocolId,
        dose_mg: doseMg,
        route: "subcutaneous",
        injection_site: site,
        weight_kg: weightKg.trim() === "" ? null : weightKg,
        side_effects: effects,
        side_effect_severity: severity.trim() === "" ? null : severity,
        administered_by: administeredBy,
        notes: notes.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not log injection.");
      setBusy(false);
      return;
    }
    setDoseMg("");
    setWeightKg("");
    setSideEffects("");
    setSeverity("");
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
        style={{ padding: "4px 12px", fontSize: 14 }}
      >
        Log injection
      </button>
    );
  }

  return (
    <div
      className="card"
      style={{ marginTop: 12, background: "var(--paper)" }}
    >
      <h3 className="serif" style={{ fontSize: 16, marginTop: 0 }}>
        Log injection
      </h3>
      <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
        Rotate injection sites each dose to reduce lipohypertrophy.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={row2}>
          <label style={labelStyle}>
            Dose (mg)
            <input
              value={doseMg}
              onChange={(e) => setDoseMg(e.target.value)}
              inputMode="decimal"
              placeholder="0.25"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Injection site
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              style={fieldStyle}
            >
              {SITES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            Weight (kg)
            <input
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              inputMode="decimal"
              placeholder="82"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Administered by
            <select
              value={administeredBy}
              onChange={(e) => setAdministeredBy(e.target.value)}
              style={fieldStyle}
            >
              <option value="clinic">clinic</option>
              <option value="self">self</option>
              <option value="home_nurse">home_nurse</option>
            </select>
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            Side effects (comma-separated)
            <input
              value={sideEffects}
              onChange={(e) => setSideEffects(e.target.value)}
              placeholder="nausea, fatigue"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Severity (1-5)
            <input
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              inputMode="numeric"
              placeholder="2"
              style={fieldStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Notes
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tolerated well"
            style={fieldStyle}
          />
        </label>
      </div>

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button className="btn" type="button" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          className="btn ghost"
          type="button"
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
} as const;
