"use client";

import { useState } from "react";

// 2D layered anatomy (free / default) with a 3D real-model upgrade toggle.
// Both views are self-hosted under /bodymap/ and embedded as same-origin iframes.
export default function BodyMapTabs({ title = "Body map", patient }: { title?: string; patient?: string }) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const qs = patient ? `?patient=${encodeURIComponent(patient)}` : "";
  const tab = (m: "2d" | "3d", label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      style={{
        border: "none",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 13,
        padding: "8px 16px",
        borderRadius: 9,
        background: mode === m ? "var(--berry, #14834e)" : "transparent",
        color: mode === m ? "#fff" : "var(--muted, #7b8a7e)",
      }}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div
        aria-label="Body map view"
        style={{
          display: "inline-flex",
          gap: 4,
          padding: 4,
          borderRadius: 12,
          background: "var(--paper, #fffbf4)",
          border: "1px solid var(--line, #ece1ce)",
          marginBottom: 12,
        }}
      >
        {tab("2d", "2D layers")}
        {tab("3d", "3D model")}
      </div>
      <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--line, #ece1ce)" }}>
        <iframe
          key={mode}
          src={(mode === "2d" ? "/bodymap/2d.html" : "/bodymap/index.html") + qs}
          title={`${title} — ${mode === "2d" ? "2D layers" : "3D model"}`}
          style={{ width: "100%", height: "min(80vh, 760px)", border: 0, display: "block", background: "#0E2017" }}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
