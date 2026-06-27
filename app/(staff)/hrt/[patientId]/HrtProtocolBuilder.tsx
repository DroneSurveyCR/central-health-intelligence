"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HRT_HORMONES,
  HRT_ROUTES,
  defaultRouteFor,
  doseUnitFor,
} from "@/lib/hrt/templates";

export default function HrtProtocolBuilder({
  patientId,
}: {
  patientId: string;
}) {
  const router = useRouter();

  const [hormone, setHormone] = useState("");
  const [route, setRoute] = useState("intramuscular");
  const [doseUnit, setDoseUnit] = useState("mg");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [goal, setGoal] = useState("");
  const [currentDose, setCurrentDose] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function onHormone(name: string) {
    setHormone(name);
    if (name) {
      setRoute(defaultRouteFor(name));
      setDoseUnit(doseUnitFor(name));
    }
  }

  async function save() {
    if (!hormone.trim()) {
      setErr("Choose a hormone.");
      return;
    }
    if (currentDose.trim() === "" || Number.isNaN(Number(currentDose))) {
      setErr("Enter a valid starting dose.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await fetch("/api/hrt/protocol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        hormone: hormone.trim(),
        route: route || null,
        dose_unit: doseUnit || null,
        frequency: frequency.trim() || null,
        start_date: startDate || null,
        goal: goal.trim() || null,
        current_dose: currentDose,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not save protocol.");
      setBusy(false);
      return;
    }
    setHormone("");
    setFrequency("");
    setGoal("");
    setCurrentDose("");
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
            Hormone
            <select
              value={hormone}
              onChange={(e) => onHormone(e.target.value)}
              style={fieldStyle}
            >
              <option value="">Select…</option>
              {HRT_HORMONES.map((h) => (
                <option key={h.name} value={h.name}>
                  {h.label}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Route
            <select
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              style={fieldStyle}
            >
              {HRT_ROUTES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            Starting dose
            <input
              value={currentDose}
              onChange={(e) => setCurrentDose(e.target.value)}
              inputMode="decimal"
              placeholder="100"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Dose unit
            <select
              value={doseUnit}
              onChange={(e) => setDoseUnit(e.target.value)}
              style={fieldStyle}
            >
              <option value="mg">mg</option>
              <option value="mcg">mcg</option>
              <option value="IU">IU</option>
              <option value="mL">mL</option>
            </select>
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            Frequency
            <input
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="weekly"
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
          Goal
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Optimize free testosterone"
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
