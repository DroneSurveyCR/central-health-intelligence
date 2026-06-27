"use client";

import { useState } from "react";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/billing/plans";

export default function PlanPicker({
  current,
  canManage,
  seats,
  hasCustomer,
  setupPaid,
}: {
  current: PlanId;
  canManage: boolean;
  seats: number;
  hasCustomer: boolean;
  setupPaid: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // POST a billing endpoint and redirect to the Stripe-hosted URL it returns.
  async function go(key: string, url: string, body?: unknown) {
    setBusy(key);
    setErr(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error || "Something went wrong");
        setBusy(null);
        return;
      }
      if (j.url) window.location.href = j.url;
      else setBusy(null);
    } catch {
      setErr("Network error");
      setBusy(null);
    }
  }

  const choose = (plan: PlanId) => go(plan, "/api/billing/checkout", { plan });

  return (
    <div>
      {err && (
        <div className="card" style={{ marginTop: 12, borderColor: "var(--berry)", color: "var(--berry)", fontSize: 14 }}>
          {err}
        </div>
      )}

      {canManage && (
        <div className="card" style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200, fontSize: 14 }}>
            <strong>Billing is per provider.</strong>{" "}
            <span className="muted">
              You have {seats} active {seats === 1 ? "provider" : "providers"}; your plan is billed for {seats}{" "}
              {seats === 1 ? "seat" : "seats"}.
            </span>
          </div>
          <button className="btn" disabled={busy != null || !hasCustomer} onClick={() => go("portal", "/api/billing/portal")}>
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </button>
        </div>
      )}
      {canManage && !hasCustomer && (
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Choose a plan first to set up a billing account, then you can manage it here.
        </p>
      )}

      {canManage && (
        <div
          className="card"
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            outline: setupPaid ? "none" : "2px solid var(--berry)",
          }}
        >
          <div style={{ flex: 1, minWidth: 200, fontSize: 14 }}>
            <strong>HIPAA setup &amp; onboarding</strong> · one-time
            <br />
            <span className="muted">
              {setupPaid ? "Paid — thank you. Your HIPAA onboarding is complete." : "Required one-time fee to provision your HIPAA-compliant environment."}
            </span>
          </div>
          {setupPaid ? (
            <span className="badge">Paid</span>
          ) : (
            <button className="btn" disabled={busy != null} onClick={() => go("setup", "/api/billing/setup-fee")}>
              {busy === "setup" ? "Starting…" : "Pay setup fee"}
            </button>
          )}
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
