"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { Finding } from "./Body3D";

const Body3D = dynamic(() => import("./Body3D"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", display: "grid", placeItems: "center" }} className="muted">
      Loading 3D body…
    </div>
  ),
});

const SEV_BG: Record<string, string> = {
  mild: "#f4a63c",
  moderate: "#ee7a4f",
  high: "#c0392b",
};

function fmtDate(d?: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

export default function Body3DViewer({
  before,
  after,
  beforeDate,
  afterDate,
}: {
  before: Finding[];
  after: Finding[];
  beforeDate?: string;
  afterDate?: string;
}) {
  const hasBefore = before.length > 0;
  const [t, setT] = useState(1);
  const [selected, setSelected] = useState<string>("");

  const activeFindings = hasBefore && t < 0.5 ? before : after;
  const sel = selected
    ? activeFindings.find((f) => (f.region_code || "").toLowerCase() === selected)
    : null;

  return (
    <div>
      <div
        style={{
          height: 480,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--line)",
          background: "#fbf4e8",
        }}
      >
        <Body3D before={before} after={after} t={hasBefore ? t : 1} selected={selected} onSelect={setSelected} />
      </div>

      {hasBefore ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }} className="muted">
            <span>Baseline · {fmtDate(beforeDate)}</span>
            <span>Latest · {fmtDate(afterDate)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={t}
            onChange={(e) => setT(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "var(--berry)" }}
          />
          <p className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 2 }}>
            Drag the slider to morph between scans · drag the body to rotate · tap a region for detail
          </p>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Drag to rotate · tap a region for detail. A second scan will unlock the before/after morph.
        </p>
      )}

      {selected && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <b style={{ textTransform: "capitalize" }}>{selected}</b>
            {sel?.system && <span className="muted">· {sel.system}</span>}
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                background: SEV_BG[(sel?.severity || "").toLowerCase()] || "#7a9e8b",
                padding: "2px 10px",
                borderRadius: 999,
                textTransform: "capitalize",
              }}
            >
              {sel?.severity || "clear"}
            </span>
          </div>
          <p style={{ margin: "8px 0 0" }}>{sel?.finding_text || "No findings recorded for this region in this scan."}</p>
        </div>
      )}
    </div>
  );
}
