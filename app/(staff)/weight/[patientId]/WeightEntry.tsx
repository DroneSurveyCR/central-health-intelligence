"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WeightEntry({ patientId }: { patientId: string }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [measuredOn, setMeasuredOn] = useState(today);
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [muscleMassKg, setMuscleMassKg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setErr("");
    setSaved(false);
    const w = Number(weightKg);
    if (!Number.isFinite(w) || w <= 0 || w >= 500) {
      setErr("Enter a weight in kg (between 0 and 500).");
      return;
    }
    if (bodyFatPct !== "") {
      const bf = Number(bodyFatPct);
      if (!Number.isFinite(bf) || bf < 0 || bf > 70) {
        setErr("Body fat % must be between 0 and 70.");
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          measured_on: measuredOn,
          weight_kg: w,
          body_fat_pct: bodyFatPct === "" ? null : Number(bodyFatPct),
          muscle_mass_kg: muscleMassKg === "" ? null : Number(muscleMassKg),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error || "Could not save — please try again.");
        setBusy(false);
        return;
      }
      setWeightKg("");
      setBodyFatPct("");
      setMuscleMassKg("");
      setSaved(true);
      setBusy(false);
      router.refresh();
    } catch {
      setErr("Could not save — please try again.");
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 10,
        }}
      >
        <label style={labelStyle}>
          Date
          <input
            type="date"
            value={measuredOn}
            max={today}
            onChange={(e) => {
              setMeasuredOn(e.target.value);
              setSaved(false);
            }}
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          Weight (kg)
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={weightKg}
            onChange={(e) => {
              setWeightKg(e.target.value);
              setSaved(false);
            }}
            placeholder="72.5"
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          Body fat (%)
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="70"
            value={bodyFatPct}
            onChange={(e) => {
              setBodyFatPct(e.target.value);
              setSaved(false);
            }}
            placeholder="22.0"
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          Muscle (kg)
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={muscleMassKg}
            onChange={(e) => {
              setMuscleMassKg(e.target.value);
              setSaved(false);
            }}
            placeholder="34.0"
            style={fieldStyle}
          />
        </label>
      </div>

      {err && (
        <p style={{ margin: "10px 0 0", color: "#b4231f", fontSize: 13 }}>{err}</p>
      )}

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          className="btn"
          onClick={save}
          disabled={busy}
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Saving…" : "Add measurement"}
        </button>
        {saved && (
          <span
            style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              background: "rgba(20,131,78,0.12)",
              color: "var(--berry)",
            }}
          >
            Added
          </span>
        )}
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
  padding: "10px 12px",
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  fontSize: 15,
  background: "#fff",
} as const;
