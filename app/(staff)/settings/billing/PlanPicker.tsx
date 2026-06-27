"use client";

import { useState } from "react";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/billing/plans";

export default function PlanPicker({ current, canManage }: { current: PlanId; canManage: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function choose(plan: PlanId) {
    setBusy(plan);
    setErr(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error || "Could not start checkout");
        setBusy(null);
        return;
      }
      if (j.url) window.location.href = j.url;
    } catch {
      setErr("Network error");
      setBusy(null);
    }
  }

  return (
    <div>
      {err && (
        <div className="card" style={{ marginTop: 12, borderColor: "var(--berry)", color: "var(--berry)", fontSize: 14 }}>
          {err}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginTop: 16 }}>
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = id === current;
          return (
            <div
              key={id}
              className="card"
              style={{ display: "flex", flexDirection: "column", gap: 8, outline: isCurrent ? "2px solid var(--berry)" : "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="serif" style={{ fontSize: 18 }}>{p.label}</span>
                {isCurrent && <span className="badge">Current</span>}
              </div>
              <div className="serif" style={{ fontSize: 24 }}>
                {p.priceMonthly ? `$${p.priceMonthly}` : "Custom"}
                {p.priceMonthly ? <span className="muted" style={{ fontSize: 13 }}>/mo</span> : null}
              </div>
              <div className="muted" style={{ fontSize: 13, flex: 1 }}>{p.blurb}</div>
              <button
                className="btn"
                disabled={isCurrent || !canManage || busy != null || p.priceMonthly === 0}
                onClick={() => choose(id)}
                style={{ marginTop: 4 }}
              >
                {isCurrent ? "Active" : p.priceMonthly === 0 ? "Contact sales" : busy === id ? "Starting…" : "Choose"}
              </button>
            </div>
          );
        })}
      </div>
      {!canManage && (
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          Only a practice admin/doctor can change the plan.
        </p>
      )}
    </div>
  );
}
