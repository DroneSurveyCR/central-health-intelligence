"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SITES = [
  "glute_l",
  "glute_r",
  "thigh_l",
  "thigh_r",
  "delt_l",
  "delt_r",
  "abdomen_l",
  "abdomen_r",
  "n/a",
];

export default function HrtAdministrationLogger({
  protocolId,
  patientId,
  route,
  doseUnit,
}: {
  protocolId: string;
  patientId: string;
  route: string | null;
  doseUnit: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [dose, setDose] = useState("");
  const [site, setSite] = useState("glute_l");
  const [sideEffects, setSideEffects] = useState("");
  const [severity, setSeverity] = useState("");
  const [administeredBy, setAdministeredBy] = useState("clinic");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (dose.trim() === "" || Number.isNaN(Number(dose))) {
      setErr("Enter a valid dose.");
      return;
    }
    setBusy(true);
    setErr("");
    const effects = sideEffects
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const res = await fetch("/api/hrt/administration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        protocol_id: protocolId,
        dose,
        dose_unit: doseUnit,
        route: route ?? null,
        injection_site: site === "n/a" ? null : site,
        side_effects: effects,
        side_effect_severity: severity.trim() === "" ? null : severity,
        administered_by: administeredBy,
        notes: notes.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not log administration.");
      setBusy(false);
      return;
    }
    setDose("");
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
        Log administration
      </button>
    );
  }

  return (
    <div className="card" style={{ marginTop: 12, background: "var(--paper)" }}>
      <h3 className="serif" style={{ fontSize: 16, marginTop: 0 }}>
        Log administration
      </h3>
      <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
        Rotate injection sites each dose to reduce lipohypertrophy.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={row2}>
          <label style={labelStyle}>
            Dose ({doseUnit})
            <input
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              inputMode="decimal"
              placeholder="100"
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
            Side effects (comma-separated)
            <input
              value={sideEffects}
              onChange={(e) => setSideEffects(e.target.value)}
              placeholder="acne, water retention"
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

        <div style={row2}>
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
