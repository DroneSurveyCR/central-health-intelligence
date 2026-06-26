"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const CONNECTORS = [
  "oura",
  "garmin",
  "whoop",
  "dexcom",
  "withings",
  "manual_csv",
] as const;

export default function WearableImport({ patientId }: { patientId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [connectorSlug, setConnectorSlug] = useState<string>("manual_csv");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr("Choose a CSV file first.");
      return;
    }

    setBusy(true);
    setErr("");
    setMsg("");

    const form = new FormData();
    form.append("file", file);
    form.append("patientId", patientId);
    form.append("connectorSlug", connectorSlug);

    const res = await fetch("/api/wearable/import", {
      method: "POST",
      body: form,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || "Could not import CSV.");
      setBusy(false);
      return;
    }
    setMsg(`Imported ${j.imported} day${j.imported === 1 ? "" : "s"}.`);
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 760, marginTop: 8 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        Import wearable / CGM data
      </h2>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Upload a CSV export. Columns are matched flexibly (date, resting_hr,
        hrv, sleep_hours, steps, readiness, spo2, weight, glucose, tir).
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <label style={labelStyle}>
          Connector
          <select
            value={connectorSlug}
            onChange={(e) => setConnectorSlug(e.target.value)}
            style={fieldStyle}
          >
            {CONNECTORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          CSV file
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={fieldStyle} />
        </label>
        <button className="btn" type="button" disabled={busy} onClick={upload}>
          {busy ? "Importing…" : "Upload"}
        </button>
      </div>

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}
      {msg && (
        <p className="muted" style={{ marginTop: 12 }}>
          {msg}
        </p>
      )}
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
