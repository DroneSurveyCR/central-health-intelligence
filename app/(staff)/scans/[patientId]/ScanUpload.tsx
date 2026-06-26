"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function ScanUpload({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [scanType, setScanType] = useState("bioresonance");
  const [scanDate, setScanDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg("Uploading…");

    const supabase = createClient();
    const safe = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
    const path = `scans/${patientId}/${Date.now()}-${safe}`;

    const { error: upErr } = await supabase.storage
      .from("patient-files")
      .upload(path, file, { upsert: false });

    if (upErr) {
      setMsg(upErr.message);
      setBusy(false);
      return;
    }

    setMsg("Creating scan…");
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        raw_pdf_ref: path,
        scan_type: scanType,
        scan_date: scanDate,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(data.error ?? "Could not create scan.");
      setBusy(false);
      return;
    }

    setMsg("Scan added ✓");
    setBusy(false);
    e.target.value = "";
    router.refresh();
  }

  return (
    <div
      className="card"
      style={{ padding: 16, maxWidth: 520, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <h3 className="serif" style={{ fontSize: 18, margin: 0 }}>
        Upload a scan
      </h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
          <span>Type</span>
          <select
            value={scanType}
            onChange={(e) => setScanType(e.target.value)}
            disabled={busy}
          >
            <option value="bioresonance">Bioresonance</option>
            <option value="blood">Blood panel</option>
            <option value="thermography">Thermography</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
          <span>Scan date</span>
          <input
            type="date"
            value={scanDate}
            onChange={(e) => setScanDate(e.target.value)}
            disabled={busy}
          />
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 }}>
        <span>PDF file</span>
        <input type="file" accept="application/pdf" onChange={onFile} disabled={busy} />
      </label>
      {msg && <em className="muted">{msg}</em>}
    </div>
  );
}
