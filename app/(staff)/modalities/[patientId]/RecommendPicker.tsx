"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PickModality = {
  id: string;
  name: string;
  category: string | null;
  target_markers: string[] | null;
};

/** Split a comma/newline list into a clean string[]. */
function toList(s: string): string[] {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export default function RecommendPicker({
  patientId,
  modalities,
}: {
  patientId: string;
  modalities: PickModality[];
}) {
  const router = useRouter();

  const [modalityId, setModalityId] = useState("");
  const [rationale, setRationale] = useState("");
  const [markers, setMarkers] = useState("");
  const [windowDays, setWindowDays] = useState("90");
  const [sessions, setSessions] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function onPick(id: string) {
    setModalityId(id);
    const m = modalities.find((x) => x.id === id);
    // Pre-fill target markers from the modality's defaults.
    setMarkers(m?.target_markers?.join(", ") ?? "");
  }

  async function save() {
    if (!modalityId) {
      setErr("Choose a modality.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await fetch("/api/modalities/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        modality_id: modalityId,
        rationale: rationale.trim() || null,
        target_markers: toList(markers),
        measurement_window_days: windowDays.trim() === "" ? 90 : Number(windowDays),
        sessions_total: sessions.trim() === "" ? null : Number(sessions),
        next_session_at: nextAt || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not save recommendation.");
      setBusy(false);
      return;
    }
    setModalityId("");
    setRationale("");
    setMarkers("");
    setWindowDays("90");
    setSessions("");
    setNextAt("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 640, marginTop: 8 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        Recommend a modality
      </h2>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        A recommendation sets up observational tracking — what markers you&apos;ll
        watch and over what window. It is not a promise of a result.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={labelStyle}>
          Modality
          <select
            value={modalityId}
            onChange={(e) => onPick(e.target.value)}
            style={fieldStyle}
          >
            <option value="">Select…</option>
            {modalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.category ? ` (${m.category})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Rationale (clinical reasoning, not a claim)
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Patient reports low energy and poor recovery; trialing to observe HRV / energy response."
            rows={3}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Target markers (comma separated)
          <input
            value={markers}
            onChange={(e) => setMarkers(e.target.value)}
            placeholder="HRV, CRP, sleep quality"
            style={fieldStyle}
          />
        </label>

        <div style={row3}>
          <label style={labelStyle}>
            Window (days)
            <input
              value={windowDays}
              onChange={(e) => setWindowDays(e.target.value)}
              inputMode="numeric"
              placeholder="90"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Sessions (course)
            <input
              value={sessions}
              onChange={(e) => setSessions(e.target.value)}
              inputMode="numeric"
              placeholder="6"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Next session
            <input
              type="date"
              value={nextAt}
              onChange={(e) => setNextAt(e.target.value)}
              style={fieldStyle}
            />
          </label>
        </div>
      </div>

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn" type="button" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Recommend"}
        </button>
      </div>
    </div>
  );
}

const row3 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
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
  fontFamily: "inherit",
} as const;
