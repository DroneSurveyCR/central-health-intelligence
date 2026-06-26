"use client";

import { useState } from "react";

export type InsuranceRecord = {
  id: string;
  insurer: string;
  policy_number: string | null;
  group_number: string | null;
  subscriber_name: string | null;
  effective_date: string | null;
  notes: string | null;
};

const FIELDS: { key: keyof Omit<InsuranceRecord, "id">; label: string; type?: string }[] = [
  { key: "insurer", label: "Insurer *" },
  { key: "policy_number", label: "Policy number" },
  { key: "group_number", label: "Group number" },
  { key: "subscriber_name", label: "Subscriber name" },
  { key: "effective_date", label: "Effective date", type: "date" },
  { key: "notes", label: "Notes" },
];

const input: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "8px 10px",
  border: "1px solid var(--line)", borderRadius: 8, fontSize: 14,
};

export default function InsuranceManager({
  patientId,
  initial,
}: {
  patientId: string;
  initial: InsuranceRecord[];
}) {
  const [records, setRecords] = useState<InsuranceRecord[]>(initial);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add() {
    if (!form.insurer?.trim()) { setErr("Insurer is required."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/insurance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId, ...form }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "Could not save."); return; }
      setRecords([
        ...records,
        {
          id: json.id, insurer: form.insurer.trim(),
          policy_number: form.policy_number?.trim() || null,
          group_number: form.group_number?.trim() || null,
          subscriber_name: form.subscriber_name?.trim() || null,
          effective_date: form.effective_date || null,
          notes: form.notes?.trim() || null,
        },
      ]);
      setForm({});
    } catch { setErr("Network error."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true);
    const prev = records;
    setRecords(records.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/insurance?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) setRecords(prev);
    } catch { setRecords(prev); }
    finally { setBusy(false); }
  }

  return (
    <div>
      {records.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10, marginBottom: 20 }}>
          {records.map((r) => (
            <li key={r.id} className="card" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div className="serif" style={{ fontSize: 16 }}>{r.insurer}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {[
                    r.policy_number && `Policy ${r.policy_number}`,
                    r.group_number && `Group ${r.group_number}`,
                    r.subscriber_name && `Subscriber ${r.subscriber_name}`,
                    r.effective_date && `Effective ${r.effective_date}`,
                  ].filter(Boolean).join(" · ") || "No policy details"}
                </div>
                {r.notes && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{r.notes}</div>}
              </div>
              <button type="button" className="btn ghost" disabled={busy} onClick={() => remove(r.id)} style={{ fontSize: 12 }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="card">
        <h2 className="serif" style={{ fontSize: 17, marginTop: 0 }}>Add insurance</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FIELDS.map((f) => (
            <label key={f.key} style={{ fontSize: 13, gridColumn: f.key === "notes" ? "1 / -1" : undefined }}>
              <span className="muted">{f.label}</span>
              <input
                type={f.type ?? "text"}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                style={{ ...input, marginTop: 4 }}
              />
            </label>
          ))}
        </div>
        {err && <p style={{ color: "var(--berry)", fontSize: 13, marginTop: 8 }}>{err}</p>}
        <button className="btn" onClick={add} disabled={busy} style={{ marginTop: 12 }}>
          {busy ? "Saving…" : "Add insurance"}
        </button>
      </div>
    </div>
  );
}
