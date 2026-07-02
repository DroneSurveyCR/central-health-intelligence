"use client";

import { useRef, useState } from "react";

/** Attach a Tytron thermal scan (raw file) to the saved assessment. */
export default function ThermalUpload({
  assessmentId,
  existingRef,
}: {
  assessmentId: string | null;
  existingRef: string | null;
}) {
  const [ref, setRef] = useState<string | null>(existingRef);
  const [name, setName] = useState<string>("");
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
      const res = await fetch("/api/spine/thermal", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { thermal_ref?: string; name?: string; error?: string };
      if (!res.ok || json.error) setErr(json.error ?? "Upload failed.");
      else {
        setRef(json.thermal_ref ?? null);
        setName(json.name ?? file.name);
      }
    } catch {
      setErr("Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>Tytron thermal scan</h2>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Attach the paraspinal infrared scan (PDF, CSV or image). The raw file is stored on this assessment; automated
        parsing onto the spine is on the roadmap.
      </p>
      {!assessmentId ? (
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>Save the assessment first, then attach the scan.</p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.csv,.txt,image/*"
            onChange={onFile}
            disabled={busy}
            style={{ fontSize: 13 }}
          />
          {busy && <span className="muted" style={{ fontSize: 13 }}>Uploading…</span>}
          {ref && !busy && (
            <span style={{ color: "var(--berry, #14834e)", fontSize: 13 }}>Attached{name ? `: ${name}` : ""}.</span>
          )}
          {err && <span style={{ color: "var(--rust, #c0392b)", fontSize: 13 }}>{err}</span>}
        </div>
      )}
    </section>
  );
}
