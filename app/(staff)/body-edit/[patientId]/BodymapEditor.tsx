"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BODYMAP_LAYERS,
  CROSS_DEFS,
  STATUS_OPTIONS,
  STATUS_HEX,
  blankPart,
  type BmStatus,
  type BmPart,
  type BmCross,
} from "@/lib/bodymap/schema";

type CrossRow = { id: string; name: string; st: BmStatus; sub: string; note: string };

export default function BodymapEditor({
  patientId,
  initialParts,
  initialCross,
}: {
  patientId: string;
  initialParts?: Record<string, BmPart>;
  initialCross?: BmCross[];
}) {
  const [parts, setParts] = useState<Record<string, BmPart>>(() => {
    const out: Record<string, BmPart> = {};
    for (const layer of BODYMAP_LAYERS) {
      for (const p of layer.parts) {
        out[p.id] = initialParts?.[p.id] ?? blankPart();
      }
    }
    return out;
  });

  const [cross, setCross] = useState<CrossRow[]>(() =>
    CROSS_DEFS.map((c) => {
      const prev = initialCross?.find((r) => r.id === c.id);
      return {
        id: c.id,
        name: c.name,
        sub: c.sub,
        st: prev?.st ?? "sage",
        note: prev?.note ?? "",
      };
    })
  );

  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  function setPoint(partId: string, slot: "s1" | "s2", patch: Partial<BmPart["s1"]>) {
    setParts((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], [slot]: { ...prev[partId][slot], ...patch } },
    }));
  }
  function setNote(partId: string, note: string) {
    setParts((prev) => ({ ...prev, [partId]: { ...prev[partId], note } }));
  }
  function setCrossRow(id: string, patch: Partial<CrossRow>) {
    setCross((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save() {
    setBusy(true);
    setOk(false);
    setErr("");
    try {
      const res = await fetch("/api/bodymap-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, parts, cross }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setErr(j.error || "Could not save — please try again.");
        setBusy(false);
        return;
      }
      setOk(true);
      setBusy(false);
    } catch {
      setErr("Could not save — please try again.");
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      {BODYMAP_LAYERS.map((layer) => (
        <div className="card" key={layer.id} style={cardStyle}>
          <p className="eyebrow">{layer.name}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {layer.parts.map((part) => {
              const value = parts[part.id];
              return (
                <div key={part.id} style={rowStyle}>
                  <div style={{ minWidth: 150 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{part.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {part.metric}
                    </div>
                  </div>

                  <PointGroup
                    label="Baseline"
                    point={value.s1}
                    onStatus={(st) => setPoint(part.id, "s1", { st })}
                    onValue={(v) => setPoint(part.id, "s1", { v })}
                    onScore={(score) => setPoint(part.id, "s1", { score })}
                  />
                  <PointGroup
                    label="Projected"
                    point={value.s2}
                    onStatus={(st) => setPoint(part.id, "s2", { st })}
                    onValue={(v) => setPoint(part.id, "s2", { v })}
                    onScore={(score) => setPoint(part.id, "s2", { score })}
                  />

                  <label style={{ ...labelStyle, flex: "1 1 100%" }}>
                    Note
                    <input
                      type="text"
                      value={value.note}
                      onChange={(e) => setNote(part.id, e.target.value)}
                      placeholder="Optional clinical note"
                      style={fieldStyle}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="card" style={cardStyle}>
        <p className="eyebrow">Cross-cutting findings</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {cross.map((row) => (
            <div key={row.id} style={rowStyle}>
              <div style={{ minWidth: 150 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{row.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {row.sub}
                </div>
              </div>
              <label style={labelStyle}>
                Status
                <span style={selectWrapStyle}>
                  <span style={dotStyle(row.st)} />
                  <select
                    value={row.st}
                    onChange={(e) => setCrossRow(row.id, { st: e.target.value as BmStatus })}
                    style={{ ...fieldStyle, ...statusSelectStyle }}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label style={{ ...labelStyle, flex: "1 1 100%" }}>
                Note
                <input
                  type="text"
                  value={row.note}
                  onChange={(e) => setCrossRow(row.id, { note: e.target.value })}
                  placeholder="Optional clinical note"
                  style={fieldStyle}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div style={footerStyle}>
        <button className="btn" type="button" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save scan data"}
        </button>
        {ok && (
          <span className="msg ok" style={inlineMsgStyle}>
            Saved — the patient&apos;s body map is updated.{" "}
            <Link href={`/body/${patientId}`}>View body map →</Link>
          </span>
        )}
        {err && (
          <span className="msg err" style={inlineMsgStyle}>
            {err}
          </span>
        )}
      </div>
    </div>
  );
}

function PointGroup({
  label,
  point,
  onStatus,
  onValue,
  onScore,
}: {
  label: string;
  point: BmPart["s1"];
  onStatus: (st: BmStatus) => void;
  onValue: (v: string) => void;
  onScore: (score: number) => void;
}) {
  return (
    <fieldset style={groupStyle}>
      <legend style={legendStyle}>{label}</legend>
      <div style={controlsGridStyle}>
        <label style={labelStyle}>
          Status
          <span style={selectWrapStyle}>
            <span style={dotStyle(point.st)} />
            <select
              value={point.st}
              onChange={(e) => onStatus(e.target.value as BmStatus)}
              style={{ ...fieldStyle, ...statusSelectStyle }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label style={labelStyle}>
          Value
          <input
            type="text"
            value={point.v}
            onChange={(e) => onValue(e.target.value)}
            placeholder="e.g. in range"
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          Score
          <input
            type="number"
            min={0}
            max={100}
            value={point.score}
            onChange={(e) => onScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            style={fieldStyle}
          />
        </label>
      </div>
    </fieldset>
  );
}

const cardStyle = { marginBottom: 16 } as const;

const rowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  alignItems: "flex-start",
  paddingBottom: 18,
  borderBottom: "1px solid var(--line)",
} as const;

const groupStyle = {
  border: "1px solid var(--line)",
  borderRadius: 11,
  padding: "8px 12px 12px",
  margin: 0,
  flex: "1 1 240px",
  minInlineSize: 0,
} as const;

const legendStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted)",
  padding: "0 4px",
} as const;

const controlsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
  gap: 10,
} as const;

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
} as const;

const fieldStyle = {
  padding: "10px 11px",
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  fontSize: 14,
  background: "#fff",
  inlineSize: "100%",
  boxSizing: "border-box",
} as const;

const selectWrapStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
} as const;

const statusSelectStyle = { paddingLeft: 30 } as const;

function dotStyle(st: BmStatus) {
  return {
    position: "absolute",
    left: 11,
    inlineSize: 10,
    blockSize: 10,
    borderRadius: "50%",
    background: STATUS_HEX[st],
    pointerEvents: "none",
  } as const;
}

const footerStyle = {
  position: "sticky",
  bottom: 0,
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  alignItems: "center",
  padding: "14px 0",
  marginTop: 4,
  background: "var(--paper)",
  borderTop: "1px solid var(--line)",
} as const;

const inlineMsgStyle = { margin: 0 } as const;
