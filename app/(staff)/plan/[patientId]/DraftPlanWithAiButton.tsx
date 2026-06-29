"use client";

// Doctor-side "draft the 90-day plan with AI" affordance. Posts to /api/ai/plan,
// which creates a DRAFT plan (status 'draft') + phases + items from the client's
// uploaded data. On success we refresh so the draft appears for review/approval.

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DraftPlanWithAiButton({
  patientId,
  aiEnabled,
  className = "btn",
  label = "Draft 90-day plan with AI",
}: {
  patientId: string;
  aiEnabled: boolean;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!aiEnabled) {
    return (
      <button className={`${className} ghost`} disabled title="Add ANTHROPIC_API_KEY to enable AI features">
        {label}
      </button>
    );
  }

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        setErr(json.error ?? "AI request failed.");
      } else {
        router.refresh();
      }
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <button className={className} onClick={run} disabled={busy} style={{ textDecoration: "none" }}>
        {busy ? "Drafting plan…" : label}
      </button>
      {err && <span style={{ color: "var(--berry)", fontSize: 12 }}>{err}</span>}
    </span>
  );
}
