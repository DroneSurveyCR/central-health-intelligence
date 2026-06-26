"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BoolKey =
  | "cv_hypertension"
  | "cv_arrhythmia"
  | "psych_schizophrenia"
  | "psych_bipolar_i"
  | "psych_active_psychosis"
  | "psych_suicidal_ideation"
  | "sub_benzodiazepine"
  | "sub_lithium"
  | "sub_maoi"
  | "sub_ssri"
  | "ibo_qt_prolongation"
  | "ibo_liver_disease"
  | "med_seizure_history"
  | "med_pregnancy";

const GROUPS: { title: string; items: { key: BoolKey; label: string }[] }[] = [
  {
    title: "Cardiovascular",
    items: [
      { key: "cv_hypertension", label: "Uncontrolled hypertension" },
      { key: "cv_arrhythmia", label: "Arrhythmia" },
    ],
  },
  {
    title: "Psychiatric",
    items: [
      { key: "psych_schizophrenia", label: "Schizophrenia" },
      { key: "psych_bipolar_i", label: "Bipolar I" },
      { key: "psych_active_psychosis", label: "Active psychosis" },
      { key: "psych_suicidal_ideation", label: "Active suicidal ideation" },
    ],
  },
  {
    title: "Substance / Medication",
    items: [
      { key: "sub_benzodiazepine", label: "Benzodiazepine" },
      { key: "sub_lithium", label: "Lithium" },
      { key: "sub_maoi", label: "MAOI" },
      { key: "sub_ssri", label: "SSRI" },
    ],
  },
  {
    title: "Ibogaine-specific",
    items: [
      { key: "ibo_qt_prolongation", label: "QT prolongation" },
      { key: "ibo_liver_disease", label: "Liver disease" },
    ],
  },
  {
    title: "Medical",
    items: [
      { key: "med_seizure_history", label: "Seizure history" },
      { key: "med_pregnancy", label: "Pregnancy" },
    ],
  },
];

function emptyFlags(): Record<BoolKey, boolean> {
  const out = {} as Record<BoolKey, boolean>;
  for (const g of GROUPS) for (const i of g.items) out[i.key] = false;
  return out;
}

export default function ScreeningForm({
  patientId,
  substances,
}: {
  patientId: string;
  substances: string[];
}) {
  const router = useRouter();

  const [substance, setSubstance] = useState(substances[0] ?? "");
  const [screeningDate, setScreeningDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [flags, setFlags] = useState<Record<BoolKey, boolean>>(emptyFlags());
  const [ecgQtMs, setEcgQtMs] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<string>("");

  function toggle(key: BoolKey) {
    setFlags((f) => ({ ...f, [key]: !f[key] }));
  }

  async function save() {
    setBusy(true);
    setErr("");
    setResult("");
    const res = await fetch("/api/psychedelic/screening", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        substance,
        screening_date: screeningDate || null,
        ...flags,
        ecg_qt_ms: ecgQtMs.trim() === "" ? null : ecgQtMs,
        current_medications: currentMedications.trim() || null,
        notes: notes.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not save screening.");
      setBusy(false);
      return;
    }
    const j = await res.json().catch(() => ({}));
    setResult(j.screening_result || "");
    setFlags(emptyFlags());
    setEcgQtMs("");
    setCurrentMedications("");
    setNotes("");
    setBusy(false);
    router.refresh();
  }

  const resultColor =
    result === "contraindicated"
      ? "var(--berry)"
      : result === "cleared"
        ? "#1f7a4d"
        : "var(--muted)";

  return (
    <div className="card" style={{ maxWidth: 680, marginTop: 16 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        Contraindication screening
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={row2}>
          <label style={labelStyle}>
            Substance
            <select
              value={substance}
              onChange={(e) => setSubstance(e.target.value)}
              style={fieldStyle}
            >
              {substances.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Screening date
            <input
              type="date"
              value={screeningDate}
              onChange={(e) => setScreeningDate(e.target.value)}
              style={fieldStyle}
            />
          </label>
        </div>

        {GROUPS.map((g) => (
          <fieldset
            key={g.title}
            style={{
              border: "1.5px solid var(--line)",
              borderRadius: 11,
              padding: "10px 13px",
            }}
          >
            <legend style={{ fontSize: 12, fontWeight: 700, padding: "0 6px" }}>
              {g.title}
            </legend>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px 18px",
              }}
            >
              {g.items.map((i) => (
                <label
                  key={i.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={flags[i.key]}
                    onChange={() => toggle(i.key)}
                  />
                  {i.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <label style={labelStyle}>
          ECG QT (ms)
          <input
            value={ecgQtMs}
            onChange={(e) => setEcgQtMs(e.target.value)}
            inputMode="numeric"
            placeholder="420"
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Current medications
          <textarea
            value={currentMedications}
            onChange={(e) => setCurrentMedications(e.target.value)}
            rows={2}
            style={fieldStyle}
          />
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
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}
      {result && (
        <p style={{ marginTop: 12 }}>
          Result:{" "}
          <span
            className="badge"
            style={{ background: resultColor, color: "#fff" }}
          >
            {result}
          </span>
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn" type="button" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save screening"}
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
