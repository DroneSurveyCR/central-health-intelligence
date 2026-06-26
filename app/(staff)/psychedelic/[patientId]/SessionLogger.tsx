"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { suggestedDose } from "@/lib/psychedelic/dosing";

const SESSION_TYPES = [
  { value: "preparation", label: "Preparation" },
  { value: "journey", label: "Journey" },
  { value: "integration", label: "Integration" },
  { value: "followup", label: "Follow-up" },
];

export default function SessionLogger({ patientId }: { patientId: string }) {
  const router = useRouter();

  const [sessionType, setSessionType] = useState("preparation");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [substance, setSubstance] = useState("");
  const [compound, setCompound] = useState("");
  const [route, setRoute] = useState("");
  const [doseMg, setDoseMg] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [intention, setIntention] = useState("");
  const [setting, setSetting] = useState("");
  const [practitionerNotes, setPractitionerNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const weightNum = Number(weightKg);
  const showHint = substance.trim() !== "" && weightKg.trim() !== "" &&
    Number.isFinite(weightNum) && weightNum > 0;
  const hint = showHint ? suggestedDose(substance, weightNum) : null;

  async function save() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/psychedelic/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        session_type: sessionType,
        session_date: sessionDate || null,
        substance: substance.trim() || null,
        compound: compound.trim() || null,
        route: route.trim() || null,
        dose_mg: doseMg.trim() === "" ? null : doseMg,
        patient_weight_kg: weightKg.trim() === "" ? null : weightKg,
        intention_statement: intention.trim() || null,
        setting_location: setting.trim() || null,
        practitioner_notes: practitionerNotes.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not save session.");
      setBusy(false);
      return;
    }
    setSubstance("");
    setCompound("");
    setRoute("");
    setDoseMg("");
    setWeightKg("");
    setIntention("");
    setSetting("");
    setPractitionerNotes("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 680, marginTop: 16 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        Log session
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={row2}>
          <label style={labelStyle}>
            Session type
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              style={fieldStyle}
            >
              {SESSION_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Session date
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              style={fieldStyle}
            />
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            Substance
            <input
              value={substance}
              onChange={(e) => setSubstance(e.target.value)}
              placeholder="ketamine"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Compound
            <input
              value={compound}
              onChange={(e) => setCompound(e.target.value)}
              style={fieldStyle}
            />
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            Route
            <input
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="IM"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Dose (mg)
            <input
              value={doseMg}
              onChange={(e) => setDoseMg(e.target.value)}
              inputMode="decimal"
              style={fieldStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Patient weight (kg)
          <input
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            inputMode="decimal"
            placeholder="70"
            style={fieldStyle}
          />
        </label>

        {hint && (
          <div
            className="muted"
            style={{
              fontSize: 13,
              padding: "8px 11px",
              border: "1.5px dashed var(--line)",
              borderRadius: 11,
            }}
          >
            Suggested {hint.unit}:{" "}
            <strong>
              {hint.low} / {hint.mid} / {hint.high}
            </strong>{" "}
            (low / mid / high). {hint.notes}
          </div>
        )}

        <label style={labelStyle}>
          Intention statement
          <textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            rows={2}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Setting / location
          <input
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Practitioner notes
          <textarea
            value={practitionerNotes}
            onChange={(e) => setPractitionerNotes(e.target.value)}
            rows={3}
            style={fieldStyle}
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
          {busy ? "Saving…" : "Save session"}
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
