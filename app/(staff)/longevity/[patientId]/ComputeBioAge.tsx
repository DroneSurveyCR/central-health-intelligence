"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { phenoAge, extractMarkerMap } from "@/lib/longevity/biological-age";

type PanelMarker = { name: string; value: number };

export default function ComputeBioAge({
  patientId,
  chronoAge,
  latestPanelMarkers,
}: {
  patientId: string;
  chronoAge: number | null;
  latestPanelMarkers: PanelMarker[];
}) {
  const router = useRouter();

  const [computed, setComputed] = useState<number | null>(null);
  const [computeErr, setComputeErr] = useState("");

  const [manualAge, setManualAge] = useState("");
  const [scoreDate, setScoreDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function compute() {
    setComputeErr("");
    setOk("");
    if (chronoAge == null) {
      setComputeErr("Patient date of birth is required to compute bio-age.");
      return;
    }
    const map = extractMarkerMap(latestPanelMarkers);
    const result = phenoAge(map, chronoAge);
    if (result == null) {
      setComputeErr(
        "Not enough recognized markers in the latest panel (need at least 4 of: albumin, creatinine, glucose, CRP, lymphocyte %, MCV, RDW, alk phos, WBC).",
      );
      setComputed(null);
      return;
    }
    setComputed(result);
  }

  async function record(biologicalAge: number, algorithm: string) {
    if (chronoAge == null) {
      setErr("Patient date of birth is required to record a score.");
      return;
    }
    setBusy(true);
    setErr("");
    setOk("");
    const res = await fetch("/api/longevity/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        score_date: scoreDate || null,
        biological_age: biologicalAge,
        chronological_age: chronoAge,
        algorithm,
        marker_inputs:
          algorithm === "phenoage"
            ? extractMarkerMap(latestPanelMarkers)
            : null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not record score.");
      setBusy(false);
      return;
    }
    setBusy(false);
    setOk("Score recorded.");
    setComputed(null);
    setManualAge("");
    router.refresh();
  }

  async function confirmComputed() {
    if (computed == null) return;
    await record(computed, "phenoage");
  }

  async function saveManual() {
    setErr("");
    setOk("");
    const v = Number(manualAge);
    if (manualAge.trim() === "" || !Number.isFinite(v)) {
      setErr("Enter a valid biological age.");
      return;
    }
    await record(v, "manual");
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        Compute biological age
      </h2>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        PhenoAge-style estimate from the most recent biomarker panel.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          className="btn"
          type="button"
          onClick={compute}
          disabled={latestPanelMarkers.length === 0}
        >
          Compute from latest panel
        </button>
        {latestPanelMarkers.length === 0 && (
          <span className="muted" style={{ fontSize: 13, alignSelf: "center" }}>
            No panel markers available.
          </span>
        )}
      </div>

      {computeErr && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {computeErr}
        </p>
      )}

      {computed != null && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            border: "1px solid var(--line)",
            borderRadius: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="muted" style={{ fontSize: 12 }}>
              Estimated biological age
            </div>
            <div className="serif" style={{ fontSize: 26 }}>
              {computed}
              {chronoAge != null && (
                <span
                  className="muted"
                  style={{ fontSize: 14, marginLeft: 8 }}
                >
                  vs {chronoAge} chronological
                </span>
              )}
            </div>
          </div>
          <button
            className="btn"
            type="button"
            onClick={confirmComputed}
            disabled={busy}
          >
            {busy ? "Recording…" : "Confirm & record"}
          </button>
        </div>
      )}

      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--line)",
          margin: "20px 0",
        }}
      />

      <h3 className="serif" style={{ fontSize: 16, marginTop: 0 }}>
        Record a score manually
      </h3>
      <div style={row2}>
        <label style={labelStyle}>
          Biological age
          <input
            value={manualAge}
            onChange={(e) => setManualAge(e.target.value)}
            inputMode="decimal"
            placeholder="38.4"
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          Score date
          <input
            type="date"
            value={scoreDate}
            onChange={(e) => setScoreDate(e.target.value)}
            style={fieldStyle}
          />
        </label>
      </div>

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}
      {ok && (
        <p className="muted" style={{ marginTop: 12 }}>
          {ok}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button
          className="btn"
          type="button"
          disabled={busy}
          onClick={saveManual}
        >
          {busy ? "Saving…" : "Record score"}
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
