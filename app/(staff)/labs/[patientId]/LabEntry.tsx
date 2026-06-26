"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/LanguageContext";

const CATEGORIES = [
  "Metabolic",
  "Inflammation",
  "Minerals",
  "Lipids",
  "Hormones",
  "Vitamins",
  "Other",
];

export default function LabEntry({ patientId }: { patientId: string }) {
  const t = useT();
  const router = useRouter();

  const [marker, setMarker] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [optimalLow, setOptimalLow] = useState("");
  const [optimalHigh, setOptimalHigh] = useState("");
  const [category, setCategory] = useState("Metabolic");
  const [collectedOn, setCollectedOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!marker.trim() || value.trim() === "" || Number.isNaN(Number(value))) {
      setErr(t("labs_validation"));
      return;
    }
    setBusy(true);
    setErr("");
    const res = await fetch("/api/lab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        marker: marker.trim(),
        value,
        unit: unit.trim() || null,
        optimal_low: optimalLow.trim() === "" ? null : optimalLow,
        optimal_high: optimalHigh.trim() === "" ? null : optimalHigh,
        category,
        collected_on: collectedOn || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || t("labs_save_error"));
      setBusy(false);
      return;
    }
    setMarker("");
    setValue("");
    setUnit("");
    setOptimalLow("");
    setOptimalHigh("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 640, marginTop: 8 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        {t("labs_add_title")}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={row2}>
          <label style={labelStyle}>
            {t("labs_field_marker")}
            <input
              value={marker}
              onChange={(e) => setMarker(e.target.value)}
              placeholder="Vitamin D"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            {t("labs_field_value")}
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              placeholder="41"
              style={fieldStyle}
            />
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            {t("labs_field_unit")}
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="ng/mL"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            {t("labs_field_category")}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={fieldStyle}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={row2}>
          <label style={labelStyle}>
            {t("labs_field_optimal_low")}
            <input
              value={optimalLow}
              onChange={(e) => setOptimalLow(e.target.value)}
              inputMode="decimal"
              placeholder="40"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            {t("labs_field_optimal_high")}
            <input
              value={optimalHigh}
              onChange={(e) => setOptimalHigh(e.target.value)}
              inputMode="decimal"
              placeholder="80"
              style={fieldStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          {t("labs_field_collected_on")}
          <input
            type="date"
            value={collectedOn}
            onChange={(e) => setCollectedOn(e.target.value)}
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
          {busy ? t("labs_saving") : t("labs_save")}
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
