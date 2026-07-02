"use client";

import { useState } from "react";

const OPTIONS: { value: "2d" | "3d" | "both"; label: string }[] = [
  { value: "2d", label: "2D map" },
  { value: "3d", label: "3D viewer" },
  { value: "both", label: "Both" },
];

/** Super-admin picks the spine viewer for one tenant. PATCHes /api/superadmin/spine-viewer. */
export default function SpineViewerToggle({ practiceId, current }: { practiceId: string; current: string }) {
  const [viewer, setViewer] = useState<string>(current || "both");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  async function pick(value: string) {
    if (value === viewer) return;
    setBusy(true);
    setErr("");
    setSaved(false);
    try {
      const res = await fetch("/api/superadmin/spine-viewer", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ practiceId, viewer: value }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; viewer?: string };
      if (!res.ok || json.error) {
        setErr(json.error ?? "Update failed.");
      } else {
        setViewer(value);
        setSaved(true);
      }
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {err && <p style={{ color: "var(--rust, #c0392b)", fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={busy}
            onClick={() => pick(o.value)}
            style={{
              padding: "9px 15px",
              borderRadius: 10,
              cursor: busy ? "default" : "pointer",
              border: "1px solid var(--line)",
              fontWeight: viewer === o.value ? 700 : 400,
              background: viewer === o.value ? "var(--ink, #1f2937)" : "transparent",
              color: viewer === o.value ? "#fff" : "inherit",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {saved && <p className="muted" style={{ fontSize: 12.5, margin: "8px 0 0" }}>Saved.</p>}
    </div>
  );
}
