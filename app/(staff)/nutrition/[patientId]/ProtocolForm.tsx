"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DIET_TYPES = [
  "carnivore",
  "keto",
  "low_carb",
  "mediterranean",
  "elimination",
  "custom",
] as const;

export default function ProtocolForm({ patientId }: { patientId: string }) {
  const router = useRouter();

  const [protocolName, setProtocolName] = useState("");
  const [dietType, setDietType] = useState<string>("custom");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carb, setCarb] = useState("");
  const [fat, setFat] = useState("");
  const [avoid, setAvoid] = useState("");
  const [emphasize, setEmphasize] = useState("");
  const [mealTiming, setMealTiming] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function splitCsv(s: string): string[] {
    return s
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }

  async function save() {
    if (!protocolName.trim()) {
      setErr("Protocol name is required.");
      return;
    }

    const dailyTargets: Record<string, number> = {};
    if (kcal.trim() !== "" && Number.isFinite(Number(kcal)))
      dailyTargets.kcal = Number(kcal);
    if (protein.trim() !== "" && Number.isFinite(Number(protein)))
      dailyTargets.protein_g = Number(protein);
    if (carb.trim() !== "" && Number.isFinite(Number(carb)))
      dailyTargets.carb_g = Number(carb);
    if (fat.trim() !== "" && Number.isFinite(Number(fat)))
      dailyTargets.fat_g = Number(fat);

    setBusy(true);
    setErr("");
    const res = await fetch("/api/nutrition/protocol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        protocol_name: protocolName.trim(),
        diet_type: dietType,
        daily_targets:
          Object.keys(dailyTargets).length > 0 ? dailyTargets : null,
        foods_to_avoid: splitCsv(avoid),
        foods_to_emphasize: splitCsv(emphasize),
        meal_timing: mealTiming.trim() || null,
        notes: notes.trim() || null,
        start_date: startDate || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not save protocol.");
      setBusy(false);
      return;
    }
    setProtocolName("");
    setKcal("");
    setProtein("");
    setCarb("");
    setFat("");
    setAvoid("");
    setEmphasize("");
    setMealTiming("");
    setNotes("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 760, marginTop: 8 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        Set nutrition protocol
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={row2}>
          <label style={labelStyle}>
            Protocol name
            <input
              value={protocolName}
              onChange={(e) => setProtocolName(e.target.value)}
              placeholder="Metabolic Reset"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Diet type
            <select
              value={dietType}
              onChange={(e) => setDietType(e.target.value)}
              style={fieldStyle}
            >
              {DIET_TYPES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h3 className="serif" style={{ fontSize: 16, margin: "8px 0 0" }}>
          Daily targets
        </h3>
        <div style={row4}>
          <label style={labelStyle}>
            kcal
            <input
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              inputMode="numeric"
              placeholder="2200"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Protein (g)
            <input
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              inputMode="numeric"
              placeholder="160"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Carbs (g)
            <input
              value={carb}
              onChange={(e) => setCarb(e.target.value)}
              inputMode="numeric"
              placeholder="120"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Fat (g)
            <input
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              inputMode="numeric"
              placeholder="80"
              style={fieldStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Foods to avoid (comma-separated)
          <input
            value={avoid}
            onChange={(e) => setAvoid(e.target.value)}
            placeholder="seed oils, refined sugar, alcohol"
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          Foods to emphasize (comma-separated)
          <input
            value={emphasize}
            onChange={(e) => setEmphasize(e.target.value)}
            placeholder="leafy greens, wild fish, berries"
            style={fieldStyle}
          />
        </label>

        <div style={row2}>
          <label style={labelStyle}>
            Meal timing
            <input
              value={mealTiming}
              onChange={(e) => setMealTiming(e.target.value)}
              placeholder="16:8 window, 12pm–8pm"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={fieldStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...fieldStyle, resize: "vertical" }}
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
          {busy ? "Saving…" : "Save protocol"}
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
