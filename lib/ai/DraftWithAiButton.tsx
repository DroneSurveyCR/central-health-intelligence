"use client";

// Shared affordance for the AI DRAFT PRODUCERS. Posts to an AI producer route,
// which creates a 'pending' ai_drafts row; on success the new draft is waiting
// in /approvals for the doctor to edit + approve. Generic so the SOAP, message
// reply, and narrative buttons all reuse it.

import { useState } from "react";
import Link from "next/link";

type Props = {
  /** Producer endpoint, e.g. "/api/ai/soap". */
  endpoint: string;
  /** JSON body to POST (patientId + any extras). */
  body: Record<string, unknown>;
  /** Button label, e.g. "Draft SOAP with AI". */
  label: string;
  aiEnabled: boolean;
  className?: string;
};

export default function DraftWithAiButton({
  endpoint,
  body,
  label,
  aiEnabled,
  className = "btn ghost",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  if (!aiEnabled) {
    return (
      <button
        className={className}
        disabled
        title="Add ANTHROPIC_API_KEY to enable AI features"
        style={{ textDecoration: "none" }}
      >
        {label}
      </button>
    );
  }

  async function run() {
    setBusy(true);
    setErr("");
    setDone(false);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        setErr(json.error ?? "AI request failed.");
      } else {
        setDone(true);
      }
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <span style={{ color: "var(--berry)" }}>Draft queued ✓</span>
        <Link href="/approvals" className="muted" style={{ textDecoration: "underline" }}>
          Review in Approvals
        </Link>
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button className={className} onClick={run} disabled={busy} style={{ textDecoration: "none" }}>
        {busy ? "Drafting…" : label}
      </button>
      {err && <span style={{ color: "var(--berry)", fontSize: 12 }}>{err}</span>}
    </span>
  );
}
