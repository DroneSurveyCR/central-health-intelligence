"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Job = Record<string, any>;

const STATUS_LABEL: Record<string, string> = {
  pending_parse: "Queued", parsing: "Parsing…", pending_review: "Needs review",
  confirmed: "Confirmed", failed: "Failed", rejected: "Rejected",
};
const STATUS_COLOR: Record<string, string> = {
  pending_review: "#e06e2a", confirmed: "#2a9d5e", failed: "#c0392b", rejected: "#888",
  parsing: "var(--berry)", pending_parse: "#888",
};

export default function ImportReview({ job }: { job: Job }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notes, setNotes] = useState("");

  const parsed = job.parsed_data as { rows?: any[]; summary?: string; warnings?: string[]; rawText?: string } | null;
  const patient = Array.isArray(job.patients) ? job.patients[0] : job.patients;
  const registry = Array.isArray(job.connector_registry) ? job.connector_registry[0] : job.connector_registry;
  const isParsing = job.status === "pending_parse" || job.status === "parsing";

  async function doAction(action: "confirm" | "reject" | "reparse") {
    setBusy(true); setErr("");
    try {
      if (action === "reparse") {
        const res = await fetch(`/api/data/parse/${job.id}`, { method: "POST" });
        const j = await res.json();
        if (!res.ok) { setErr(j.error ?? "Failed"); return; }
      } else if (action === "confirm") {
        const res = await fetch(`/api/data/confirm/${job.id}`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ reviewerNotes: notes }),
        });
        const j = await res.json();
        if (!res.ok) { setErr(j.error ?? "Failed"); return; }
      } else {
        const res = await fetch(`/api/data/reject/${job.id}`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: notes }),
        });
        const j = await res.json();
        if (!res.ok) { setErr(j.error ?? "Failed"); return; }
      }
      router.refresh();
    } catch { setErr("Network error."); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 className="serif" style={{ fontSize: 26, margin: 0 }}>{job.raw_file_name ?? "Import"}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {patient ? `${patient.first_name} ${patient.last_name}` : ""} · {registry?.label ?? job.connector_id}
            {job.file_size_bytes ? ` · ${(job.file_size_bytes / 1024).toFixed(0)} KB` : ""}
          </p>
        </div>
        <span style={{ fontWeight: 600, color: STATUS_COLOR[job.status] ?? "#888" }}>{STATUS_LABEL[job.status] ?? job.status}</span>
      </div>

      {/* Parsing spinner */}
      {isParsing && (
        <div style={{ padding: "24px", background: "var(--paper)", borderRadius: 12, textAlign: "center", marginBottom: 20 }}>
          <p className="muted" style={{ margin: 0 }}>Parsing… refresh in a moment or click Re-parse.</p>
        </div>
      )}

      {/* Error */}
      {job.status === "failed" && (
        <div style={{ background: "rgba(192,57,43,0.08)", border: "1px solid #c0392b", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          <strong>Parse failed:</strong> {job.parse_error}
        </div>
      )}

      {/* Summary */}
      {parsed?.summary && (
        <div style={{ background: "var(--paper)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>AI Summary</strong>
          <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>{parsed.summary}</p>
        </div>
      )}

      {/* Warnings */}
      {parsed?.warnings?.length ? (
        <div style={{ background: "rgba(244,166,60,0.1)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          {parsed.warnings.map((w, i) => <p key={i} style={{ margin: "4px 0", fontSize: 13 }}>⚠ {w}</p>)}
        </div>
      ) : null}

      {/* Parsed rows preview */}
      {parsed?.rows?.length ? (
        <div style={{ marginBottom: 20 }}>
          <h2 className="serif" style={{ fontSize: 17, marginBottom: 10 }}>
            Parsed data ({parsed.rows.length} row{parsed.rows.length !== 1 ? "s" : ""})
          </h2>
          <div style={{ overflowX: "auto" }}>
            {registry?.target_table === "lab_results" ? (
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--paper)" }}>
                    {["Marker", "Value", "Unit", "Opt. low", "Opt. high", "Category", "Collected"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", border: "1px solid var(--line)", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                      {["marker", "value", "unit", "optimal_low", "optimal_high", "category", "collected_on"].map((k) => (
                        <td key={k} style={{ padding: "7px 12px", border: "1px solid var(--line)" }}>{r[k] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : registry?.target_table === "body_composition" ? (
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--paper)" }}>
                    {["Date", "Device", "Weight kg", "BMI", "Body fat %", "Muscle kg", "Water %", "Visceral fat"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", border: "1px solid var(--line)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r: any, i: number) => (
                    <tr key={i}>
                      {["measured_on", "device_model", "weight_kg", "bmi", "body_fat_pct", "muscle_mass_kg", "water_pct", "visceral_fat_level"].map((k) => (
                        <td key={k} style={{ padding: "7px 12px", border: "1px solid var(--line)" }}>{r[k] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <pre style={{ background: "var(--paper)", padding: 16, borderRadius: 10, fontSize: 12, overflowX: "auto" }}>
                {JSON.stringify(parsed.rows, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ) : null}

      {/* Confirmed target info */}
      {job.status === "confirmed" && (
        <div style={{ background: "rgba(42,157,94,0.08)", border: "1px solid #2a9d5e", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          <strong>Confirmed</strong> — {job.target_row_ids?.length ?? 0} row(s) written to <code>{job.target_table ?? registry?.target_table}</code>.
          {job.reviewer_notes && <p style={{ margin: "8px 0 0", fontSize: 13 }}>Notes: {job.reviewer_notes}</p>}
        </div>
      )}

      {/* Action bar */}
      {job.status !== "confirmed" && job.status !== "rejected" && (
        <div style={{ position: "sticky", bottom: 0, background: "var(--bg)", borderTop: "1px solid var(--line)", padding: "14px 0", marginTop: 24, display: "flex", gap: 12, alignItems: "center" }}>
          <input
            placeholder="Reviewer notes (optional)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
          />
          {job.status === "pending_review" && (
            <button className="btn" onClick={() => doAction("confirm")} disabled={busy}>
              {busy ? "Saving…" : "Confirm & save"}
            </button>
          )}
          <button className="btn ghost" onClick={() => doAction("reparse")} disabled={busy}>Re-parse</button>
          <button className="btn ghost" style={{ color: "#c0392b" }} onClick={() => doAction("reject")} disabled={busy}>Reject</button>
        </div>
      )}

      {err && <p style={{ color: "var(--berry)", fontSize: 13, marginTop: 8 }}>{err}</p>}
    </div>
  );
}
