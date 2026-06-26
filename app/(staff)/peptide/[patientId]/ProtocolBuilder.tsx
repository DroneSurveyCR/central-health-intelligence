"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PEPTIDE_COMPOUNDS,
  TITRATION_TEMPLATES,
  type TitrationStep,
} from "@/lib/peptide/templates";

export default function ProtocolBuilder({ patientId }: { patientId: string }) {
  const router = useRouter();

  const [compound, setCompound] = useState("");
  const [category, setCategory] = useState("");
  const [route, setRoute] = useState("subcutaneous");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [goal, setGoal] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [currentDose, setCurrentDose] = useState("");
  const [schedule, setSchedule] = useState<TitrationStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function onCompound(name: string) {
    setCompound(name);
    const found = PEPTIDE_COMPOUNDS.find((c) => c.name === name);
    setCategory(found?.category ?? "");
    const tpl = TITRATION_TEMPLATES[name];
    if (tpl && tpl.length) {
      setSchedule(tpl);
      setCurrentDose(String(tpl[0].dose_mg));
    } else {
      setSchedule([]);
    }
  }

  async function save() {
    if (!compound.trim()) {
      setErr("Choose a compound.");
      return;
    }
    if (currentDose.trim() === "" || Number.isNaN(Number(currentDose))) {
      setErr("Enter a valid starting dose (mg).");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await fetch("/api/peptide/protocol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        compound: compound.trim(),
        category: category || null,
        route: route || null,
        start_date: startDate || null,
        goal: goal.trim() || null,
        current_dose_mg: currentDose,
        titration_schedule: schedule,
        pharmacy_name: pharmacyName.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not save protocol.");
      setBusy(false);
      return;
    }
    setCompound("");
    setCategory("");
    setGoal("");
    setPharmacyName("");
    setCurrentDose("");
    setSchedule([]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 640, marginTop: 8 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        New protocol
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={row2}>
          <label style={labelStyle}>
            Compound
            <select
              value={compound}
              onChange={(e) => onCompound(e.target.value)}
              style={fieldStyle}
            >
              <option value="">Select…</option>
              {PEPTIDE_COMPOUNDS.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Category
            <input value={category} readOnly style={fieldStyle} />
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            Route
            <select
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              style={fieldStyle}
            >
              <option value="subcutaneous">subcutaneous</option>
              <option value="intramuscular">intramuscular</option>
              <option value="oral">oral</option>
              <option value="intravenous">intravenous</option>
            </select>
          </label>
          <label style={labelStyle}>
            Starting dose (mg)
            <input
              value={currentDose}
              onChange={(e) => setCurrentDose(e.target.value)}
              inputMode="decimal"
              placeholder="0.25"
              style={fieldStyle}
            />
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Pharmacy
            <input
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              placeholder="Compounding pharmacy"
              style={fieldStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Goal
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Weight management"
            style={fieldStyle}
          />
        </label>
      </div>

      {schedule.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p className="muted" style={{ margin: "0 0 6px", fontSize: 13 }}>
            Titration schedule
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thStyle}>Week</th>
                <th style={thStyle}>Dose (mg)</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((s) => (
                <tr key={s.week}>
                  <td style={tdStyle}>{s.week}</td>
                  <td style={tdStyle}>{s.dose_mg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn" type="button" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Create protocol"}
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
const thStyle = {
  textAlign: "left",
  borderBottom: "1.5px solid var(--line)",
  padding: "6px 8px",
  color: "var(--muted)",
} as const;
const tdStyle = {
  borderBottom: "1px solid var(--line)",
  padding: "6px 8px",
} as const;
