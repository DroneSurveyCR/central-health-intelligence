"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Patient = { id: string; first_name: string; last_name: string };
type Connector = { id: string; label: string; accepts: string[]; target_table: string; description: string | null };

export default function ImportWizard({ patients, connectors }: { patients: Patient[]; connectors: Connector[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [connector, setConnector] = useState<Connector | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Batch connectors create their own patients — skip the patient selection step.
  const isBatch = connector?.target_table === "patients";

  const filtered = patients.filter((p) =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(query.toLowerCase()),
  );

  async function upload() {
    if (!connector || !file) return;
    if (!isBatch && !patient) return;
    setUploading(true); setErr("");
    const form = new FormData();
    form.append("file", file);
    form.append("connectorId", connector.id);
    if (patient) form.append("patientId", patient.id);
    try {
      const res = await fetch("/api/data/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || json.error) { setErr(json.error ?? "Upload failed."); return; }
      router.push(`/imports/${json.importId}`);
    } catch { setErr("Network error."); }
    finally { setUploading(false); }
  }

  return (
    <div>
      {/* Step 1: Connector (always first) */}
      <div style={{ marginBottom: 24 }}>
        <h2 className="serif" style={{ fontSize: 18, marginBottom: 10 }}>
          <span style={{ color: step >= 1 ? "var(--berry)" : "var(--muted)" }}>1</span> Choose data source
        </h2>
        {step === 1 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {connectors.map((c) => (
              <button key={c.id} onClick={() => {
                setConnector(c);
                // Batch importers skip patient selection — go straight to upload.
                setStep(c.target_table === "patients" ? 3 : 2);
              }}
                style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--paper)", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</div>
                {c.description && <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{c.description}</div>}
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{c.accepts.join(", ")}</div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 600 }}>{connector?.label}</span>
            <button type="button" className="btn ghost" style={{ fontSize: 12 }} onClick={() => { setStep(1); setPatient(null); setFile(null); }}>Change</button>
          </div>
        )}
      </div>

      {/* Step 2: Patient — skipped for batch connectors */}
      {step >= 2 && !isBatch && (
        <div style={{ marginBottom: 24 }}>
          <h2 className="serif" style={{ fontSize: 18, marginBottom: 10 }}>
            <span style={{ color: step >= 2 ? "var(--berry)" : "var(--muted)" }}>2</span> Select patient
          </h2>
          {step === 2 ? (
            <div>
              <input
                placeholder="Search patients…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14, marginBottom: 8 }}
              />
              <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 8 }}>
                {filtered.slice(0, 30).map((p) => (
                  <button key={p.id} onClick={() => { setPatient(p); setStep(3); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                    {p.first_name} {p.last_name}
                  </button>
                ))}
                {!filtered.length && <p className="muted" style={{ padding: "10px 14px", fontSize: 14 }}>No patients found.</p>}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 600 }}>{patient?.first_name} {patient?.last_name}</span>
              <button type="button" className="btn ghost" style={{ fontSize: 12 }} onClick={() => { setStep(2); setFile(null); }}>Change</button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Upload */}
      {step >= 3 && connector && (
        <div style={{ marginBottom: 24 }}>
          <h2 className="serif" style={{ fontSize: 18, marginBottom: 10 }}>
            <span style={{ color: "var(--berry)" }}>{isBatch ? 2 : 3}</span> Upload file
          </h2>
          {isBatch && (
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              This connector imports multiple patients at once — no patient selection needed.
            </p>
          )}
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed var(--line)", borderRadius: 12, padding: "32px 24px", textAlign: "center", cursor: "pointer", background: "var(--paper)" }}>
            {file ? (
              <div>
                <div style={{ fontWeight: 600 }}>{file.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>{(file.size / 1024).toFixed(0)} KB · {file.type}</div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop file here or click to browse</div>
                <div className="muted" style={{ fontSize: 13 }}>Accepts: {connector.accepts.join(", ")}</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept={connector.accepts.join(",")} style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file && (
            <button className="btn" style={{ marginTop: 14 }} onClick={upload} disabled={uploading}>
              {uploading ? "Uploading & parsing…" : "Upload and parse"}
            </button>
          )}
          {err && <p style={{ color: "var(--berry)", fontSize: 13, marginTop: 8 }}>{err}</p>}
        </div>
      )}
    </div>
  );
}
