"use client";

import { useState } from "react";
import Link from "next/link";
import { VERTICAL_IDS, VERTICAL_LABELS, VERTICAL_MODULES, type Vertical } from "@/lib/modules/bundles";

export type Mod = { id: string; label: string; price: number; alwaysOn: boolean };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export default function NewInstanceForm({ modules, defaultOn }: { modules: Mod[]; defaultOn: string[] }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [vertical, setVertical] = useState<Vertical | "">("");
  const [enabled, setEnabled] = useState<Set<string>>(new Set(defaultOn));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ practiceId: string; handoffLink: string | null } | null>(null);

  function pickVertical(v: Vertical) {
    setVertical(v);
    const next = new Set(defaultOn);
    for (const id of VERTICAL_MODULES[v]) next.add(id);
    setEnabled(next);
  }
  function toggle(id: string) {
    setEnabled((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/superadmin/provision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          practiceName: name,
          slug: slug || slugify(name),
          ownerName,
          ownerEmail,
          vertical: vertical || null,
          modules: [...enabled],
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; practiceId?: string; handoffLink?: string | null };
      if (!res.ok || json.error) setErr(json.error ?? "Could not create the instance.");
      else setResult({ practiceId: json.practiceId!, handoffLink: json.handoffLink ?? null });
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
  const label: React.CSSProperties = { display: "block", fontSize: 13, marginBottom: 4, marginTop: 14 };

  if (result) {
    return (
      <div className="card">
        <div className="serif" style={{ fontSize: 19, marginBottom: 6 }}>Instance created ✓</div>
        <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
          Send this login link to the client. It signs them straight into their new instance.
        </p>
        {result.handoffLink ? (
          <textarea readOnly value={result.handoffLink} rows={3} style={{ ...input, fontFamily: "ui-monospace, monospace", fontSize: 12 }} onFocus={(e) => e.currentTarget.select()} />
        ) : (
          <p className="muted" style={{ fontSize: 13 }}>
            (No link generated — the owner email may already exist. They can sign in at /login.)
          </p>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <Link href={`/superadmin/${result.practiceId}`} className="btn">Open instance</Link>
          <Link href="/superadmin" className="btn ghost">Done</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card">
      <label style={{ ...label, marginTop: 0 }}>Practice name</label>
      <input style={input} value={name} required onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />

      <label style={label}>Slug (in URLs)</label>
      <input style={input} value={slug} required onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEdited(true); }} placeholder="casa-elev8" />

      <label style={label}>Owner name</label>
      <input style={input} value={ownerName} required onChange={(e) => setOwnerName(e.target.value)} />

      <label style={label}>Owner email</label>
      <input style={input} type="email" value={ownerEmail} required onChange={(e) => setOwnerEmail(e.target.value)} />

      <label style={label}>Vertical (preselects modules)</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {VERTICAL_IDS.map((v) => (
          <button type="button" key={v} onClick={() => pickVertical(v)}
            className={vertical === v ? "btn" : "btn ghost"} style={{ fontSize: 13, padding: "8px 12px" }}>
            {VERTICAL_LABELS[v]}
          </button>
        ))}
      </div>

      <label style={label}>Modules</label>
      <div style={{ display: "grid", gap: 6 }}>
        {modules.map((m) => (
          <label key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 10, opacity: m.alwaysOn ? 0.6 : 1 }}>
            <span><span style={{ fontWeight: 600 }}>{m.label}</span> <span className="muted" style={{ fontSize: 12 }}>{m.alwaysOn ? "· always on" : m.price ? `· $${m.price}/mo` : "· included"}</span></span>
            <input type="checkbox" checked={m.alwaysOn || enabled.has(m.id)} disabled={m.alwaysOn} onChange={() => toggle(m.id)} style={{ width: 17, height: 17 }} />
          </label>
        ))}
      </div>

      {err && <p style={{ color: "var(--rust, #c0392b)", fontSize: 13, marginTop: 12 }}>{err}</p>}
      <button type="submit" className="btn" disabled={busy} style={{ marginTop: 16 }}>
        {busy ? "Creating…" : "Create instance"}
      </button>
    </form>
  );
}
