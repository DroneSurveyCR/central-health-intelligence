"use client";

import { useState } from "react";

export type Mod = { id: string; label: string; price: number; enabled: boolean; alwaysOn: boolean };

/** Super-admin toggles for one practice's modules. PATCHes /api/superadmin/modules. */
export default function ModuleOverride({ practiceId, modules }: { practiceId: string; modules: Mod[] }) {
  const [state, setState] = useState<Mod[]>(modules);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function toggle(id: string, enabled: boolean) {
    setBusy(id);
    setErr("");
    try {
      const res = await fetch("/api/superadmin/modules", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ practiceId, moduleId: id, enabled }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; modules?: string[] };
      if (!res.ok || json.error) {
        setErr(json.error ?? "Update failed.");
      } else {
        const next = new Set<string>(json.modules ?? []);
        // The API may add dependencies (e.g. peptide → rx); reflect the full returned set.
        setState((prev) => prev.map((m) => ({ ...m, enabled: m.alwaysOn || next.has(m.id) })));
      }
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {err && (
        <p style={{ color: "var(--rust, #c0392b)", fontSize: 13, margin: "0 0 10px" }}>{err}</p>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {state.map((m) => (
          <label
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "11px 14px",
              border: "1px solid var(--line)",
              borderRadius: 11,
              opacity: m.alwaysOn ? 0.6 : 1,
              cursor: m.alwaysOn ? "default" : "pointer",
            }}
          >
            <span>
              <span style={{ fontWeight: 600 }}>{m.label}</span>{" "}
              <span className="muted" style={{ fontSize: 12.5 }}>
                {m.alwaysOn ? "· always on" : m.price ? `· $${m.price}/mo` : "· included"}
              </span>
            </span>
            <input
              type="checkbox"
              checked={m.enabled}
              disabled={m.alwaysOn || busy === m.id}
              onChange={(e) => toggle(m.id, e.target.checked)}
              style={{ width: 18, height: 18, cursor: m.alwaysOn ? "default" : "pointer" }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
