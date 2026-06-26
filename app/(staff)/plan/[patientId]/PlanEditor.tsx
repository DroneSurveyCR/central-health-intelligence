"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanLevel } from "@/lib/plan/helpers";
import { useToast } from "@/components/Toast";

type PhaseOption = { id: string; label: string };

const LEVELS: { value: PlanLevel; label: string }[] = [
  { value: "supplement", label: "Supplement" },
  { value: "modality", label: "Modality" },
  { value: "habit", label: "Habit" },
  { value: "measurement", label: "Measurement" },
];

export default function PlanEditor({
  patientId,
  phases,
}: {
  patientId: string;
  phases: PhaseOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [phaseId, setPhaseId] = useState<string>(phases[0]?.id ?? "");
  const [level, setLevel] = useState<PlanLevel>("supplement");
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [dose, setDose] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!name.trim()) {
      setErr("Give the item a name.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_item",
        patient_id: patientId,
        phase_id: phaseId || null,
        level,
        name: name.trim(),
        detail: detail.trim() || null,
        dose: dose.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const message = j.error || "Could not add — please try again.";
      setErr(message);
      toast.error(message);
      setBusy(false);
      return;
    }
    setName("");
    setDetail("");
    setDose("");
    setBusy(false);
    setOpen(false);
    toast.success("Item added");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        className="btn"
        type="button"
        onClick={() => setOpen(true)}
        style={{ marginTop: 18 }}
      >
        + Add plan item
      </button>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 520, marginTop: 18 }}>
      <h3 className="serif" style={{ fontSize: 18, marginTop: 0 }}>
        Add plan item
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {phases.length > 0 && (
          <label style={labelStyle}>
            Phase
            <select
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value)}
              style={fieldStyle}
            >
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label style={labelStyle}>
          Level
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as PlanLevel)}
            style={fieldStyle}
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Magnesium glycinate"
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Detail
          <input
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Optional notes"
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Dose
          <input
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="e.g. 300mg before bed"
            style={fieldStyle}
          />
        </label>
      </div>

      {err && <p className="msg err" style={{ marginTop: 14 }}>{err}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        <button
          className="btn ghost"
          type="button"
          onClick={() => {
            setOpen(false);
            setErr("");
          }}
        >
          Cancel
        </button>
        <button className="btn" type="button" disabled={busy} onClick={submit}>
          {busy ? "Adding…" : "Add item"}
        </button>
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
  padding: "12px 13px",
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  fontSize: 15,
  background: "#fff",
} as const;
