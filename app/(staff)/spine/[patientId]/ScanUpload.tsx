"use client";

import { useRef, useState } from "react";
import { VERTEBRAE } from "@/lib/spine/schema";

const TYPES = [
  { value: "thermal", label: "Thermal (Tytron)" },
  { value: "xray", label: "X-ray / DICOM" },
  { value: "semg", label: "sEMG (MyoVision)" },
  { value: "posture", label: "Posture (PostureScreen)" },
  { value: "corescore", label: "CoreScore (INSiGHT)" },
  { value: "other", label: "Other" },
];

// Scan types where per-vertebra tagging is meaningful (posture/CoreScore are whole-spine).
const VERTEBRA_TAGGABLE = new Set(["thermal", "xray", "semg"]);

export type Scan = { type: string; ref: string; name: string; vertebra_code?: string | null; uploaded_at?: string };

/** Attach any device scan (thermal/X-ray/sEMG/posture/CoreScore) to the saved assessment, optionally tagged to a vertebra. */
export default function ScanUpload({
  assessmentId,
  scans,
  onAdd,
}: {
  assessmentId: string | null;
  scans: Scan[];
  onAdd: (scan: Scan) => void;
}) {
  const [scanType, setScanType] = useState("thermal");
  const [vertebraCode, setVertebraCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !assessmentId) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("assessmentId", assessmentId);
      fd.append("scanType", scanType);
      if (VERTEBRA_TAGGABLE.has(scanType) && vertebraCode) fd.append("vertebraCode", vertebraCode);
      const res = await fetch("/api/spine/scan", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { scan?: Scan; error?: string };
      if (!res.ok || json.error) setErr(json.error ?? "Upload failed.");
      else if (json.scan) onAdd(json.scan);
    } catch {
      setErr("Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const label = (v: string) => TYPES.find((t) => t.value === v)?.label ?? v;

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>Spine scans</h2>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Attach any device scan — thermal (Tytron), X-ray/DICOM, sEMG (MyoVision), posture (PostureScreen), or
        CoreScore (INSiGHT). Tag a vertebra and it shows up in that segment&apos;s findings panel.
      </p>
      {!assessmentId ? (
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>Save the assessment first, then attach scans.</p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <select
              value={scanType}
              onChange={(e) => setScanType(e.target.value)}
              disabled={busy}
              aria-label="Scan type"
              style={{ borderRadius: 8, border: "1px solid var(--line)", padding: "7px 9px", fontSize: 13 }}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {VERTEBRA_TAGGABLE.has(scanType) && (
              <select
                value={vertebraCode}
                onChange={(e) => setVertebraCode(e.target.value)}
                disabled={busy}
                aria-label="Tag to vertebra (optional)"
                style={{ borderRadius: 8, border: "1px solid var(--line)", padding: "7px 9px", fontSize: 13 }}
              >
                <option value="">Whole spine (no tag)</option>
                {VERTEBRAE.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.csv,.txt,.dcm,image/*"
              onChange={onFile}
              disabled={busy}
              style={{ fontSize: 13 }}
            />
            {busy && <span className="muted" style={{ fontSize: 13 }}>Uploading…</span>}
            {err && <span style={{ color: "var(--rust, #c0392b)", fontSize: 13 }}>{err}</span>}
          </div>
          {scans.length > 0 && (
            <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
              {scans.map((s, i) => (
                <li key={i} style={{ fontSize: 13.5, display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="badge">{label(s.type)}</span>
                  {s.vertebra_code && <span className="muted">{s.vertebra_code.toUpperCase()}</span>}
                  <span>{s.name}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
